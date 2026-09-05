/**
 * `compareSamples` —— 「两份样本 → `CompareResult`」那一整步（PRD 阶段 4 第一条）。
 *
 * 主要钉的是 PRD 阶段 4 最后一条点名的那三种差异各归其类：`string` → `string | null` 归
 * `type`、键消失归 `only-*`、可选性变化归 `optionality`。外加这一轮做过判断的两件事：
 * **方向**（`only-left` / `only-right` 那张映射表抄反了照样编译得过，只有用例拦得住）
 * 与 **PRD 4.3 那条按路径对齐**（子类型编号每次渲染独立算，两边的 `Data2` 会指着两个东西）。
 *
 * 与 `storage.test.ts` / `generated.test.ts` 同一条纪律：**不读真 corpus、不碰真产物树**。
 * 这里连临时目录都不用 —— 样本是手搓的对象、高亮函数是注入的，整个文件是纯计算。
 */

import { CORPUS_FORMAT, type CorpusSample, type CorpusVerdictKind, type JsonValue } from '@ikenxuan/amagi-typegen'
import { describe, expect, it } from 'vitest'

import { COMPARE_NOTE, compareSamples, pickSample } from '../server/compare'
import type { CompareResult, HighlightedCode } from '../shared/contract'

/**
 * 手搓一份样本。**只有 `metadata.paramsHash` 与 `raw` / `normalized` 是 `compareSamples`
 * 真的会读的**，其余按 `packages/typegen/src/corpus.ts` 那份形状填成合法的空值。
 *
 * 不走 `createCorpusSample`（`outcome.test.ts` 走的是那条）：那条路会把值过一遍脱敏、
 * 把 `paramsHash` 算成参数的哈希，于是「左边那份的哈希是什么」得反过来从实现里读出来 ——
 * 而这几条用例正要拿那个值做断言。
 */
const sample = (paramsHash: string, raw: JsonValue, kind: CorpusVerdictKind = 'store'): CorpusSample => ({
  format: CORPUS_FORMAT,
  metadata: {
    endpoint: 'videoInfo',
    platform: 'bilibili',
    params: {},
    strippedParams: [],
    paramsHash,
    recordedAt: '2026-09-05T00:00:00Z',
    http: { status: 200 },
    amagiVersion: '7.0.0',
    verdict: { kind, reason: '手搓的样本', confident: true },
    scrub: { replacements: [], suspects: [], leaks: [], warnings: [] }
  },
  raw
})

/**
 * 假高亮：**原样回**。
 *
 * 两个作用：断言直接读得到生成出来的源码（比对着 shiki 的 HTML 找 token 靠谱得多），
 * 而且这个文件不用把 shiki 那两份语法数据（`typescript.mjs` 一个文件 181 KB 的 JSON）拖进来。
 * 真那一份是 `highlight.ts` 的 `highlightCode(source, 'typescript')`，`highlight.test.ts` 盯着它。
 */
const asIs = (source: string): Promise<HighlightedCode> =>
  Promise.resolve({ html: source, chars: source.length, totalChars: source.length })

const run = (left: CorpusSample, right: CorpusSample): Promise<CompareResult> =>
  compareSamples({ platform: 'bilibili', endpoint: 'videoInfo', left, right, highlight: asIs })

/** 差异清单压成 `kind 路径` —— 只关心归类与顺序时用它 */
const kinds = (result: CompareResult): string[] => result.diffs.map((diff) => `${diff.kind} ${diff.path}`)

describe('三种差异各归其类', () => {
  /**
   * 为什么右边一份样本就能有 `| null`：**数组元素之间是合并的**
   * （`packages/typegen/test/merge-rules.test.ts:107` 钉着这条），于是 PRD 4.3 那张
   * 「单份 vs 合并」的表在同一份样本内部也成立。真实场景里这就是那句
   * 「多 P 稿件的 `desc` 有时是 null」被看见的方式。
   */
  it('`string` → `string | null` 报 `type`，两边的说法各自原样回出来', async () => {
    const result = await run(
      sample('aaaaaaaaaaaa', { items: [{ desc: '简介' }] }),
      sample('bbbbbbbbbbbb', { items: [{ desc: '简介' }, { desc: null }] })
    )
    expect(result.diffs).toEqual([{ path: 'items[].desc', kind: 'type', left: 'string', right: 'string | null' }])
    expect(result.counts).toEqual({ 'only-left': 0, 'only-right': 0, type: 1, optionality: 0 })
    // 分母：`items` 自己两边一致
    expect(result.same).toBe(1)
  })

  it('键消失报 `only-left`，**反过来传就该反过来报** —— 方向抄反了照样编译得过', async () => {
    const left = sample('aaaaaaaaaaaa', { code: 0, message: 'ok' })
    const right = sample('bbbbbbbbbbbb', { code: 0 })
    expect((await run(left, right)).diffs).toEqual([{ path: 'message', kind: 'only-left', left: 'string' }])
    expect((await run(right, left)).diffs).toEqual([{ path: 'message', kind: 'only-right', right: 'string' }])
  })

  it('可选性变化报 `optionality`，说法是 `必需` / `可选` 而不是类型表达式', async () => {
    const result = await run(
      sample('aaaaaaaaaaaa', { items: [{ id: 1, staff: 'x' }] }),
      sample('bbbbbbbbbbbb', { items: [{ id: 1 }, { id: 1, staff: 'x' }] })
    )
    expect(result.diffs).toEqual([{ path: 'items[].staff', kind: 'optionality', left: '必需', right: '可选' }])
    expect(result.counts.optionality).toBe(1)
  })
})

describe('按路径对齐，不按类型名（PRD 4.3 那条实现约束）', () => {
  /**
   * 左边：`a.data` 是 `Data`（`{p}`）、`z.data` 是 `Data2`（`{q}`）。
   * 右边多一个字母序夹在中间的 `aa`，于是编号整个后移 —— `z.data` 变成 `Data3`，
   * 而**右边的 `Data2` 指的是 `{r}`**。同一个名字在两边指着两个东西，这就是
   * `uniqueName`（`render.ts:224`）每次渲染独立算的后果。
   */
  it('两边的 `Data2` 指着不同的东西 —— 编号进不了比对，只有路径算', async () => {
    const result = await run(
      sample('aaaaaaaaaaaa', { a: { data: { p: 1 } }, z: { data: { q: 2 } } }),
      sample('bbbbbbbbbbbb', { a: { data: { p: 1 } }, aa: { data: { r: 3 } }, z: { data: { q: 2 } } })
    )
    // 先确认前提真的成立：同一个路径上两边渲出了不同的类型名。
    // 不确认的话，下面那句在生成器改了命名规则之后会变成一条不测任何东西的断言
    expect(result.left.code.html).toContain('data: Data2')
    expect(result.left.code.html).not.toContain('Data3')
    expect(result.right.code.html).toContain('data: Data3')
    // 而 `z` / `z.data` / `z.data.q` 一条差异都没有：报出来的只有右边多的那三条
    expect(kinds(result)).toEqual(['only-right aa', 'only-right aa.data', 'only-right aa.data.r'])
  })
})

describe('两边各自回什么', () => {
  it('`sampleHash` 回的是样本自己的 `paramsHash`，`fields` 是摊平之后的字段数', async () => {
    const result = await run(sample('0123456789ab', { a: 1 }), sample('ba9876543210', { a: 1, b: 2 }))
    expect(result.left.sampleHash).toBe('0123456789ab')
    expect(result.right.sampleHash).toBe('ba9876543210')
    expect(result.left.fields).toBe(1)
    expect(result.right.fields).toBe(2)
    // 自引用停下的路径：这两份样本里没有，空数组是常态
    expect(result.left.recursive).toEqual([])
    expect({ platform: result.platform, endpoint: result.endpoint }).toEqual({ platform: 'bilibili', endpoint: 'videoInfo' })
    expect(result.note).toBe(COMPARE_NOTE)
  })

  it('源码是「单份样本单独生成」的类型，**不带那个「重新生成会覆盖」的文件头**', async () => {
    const result = await run(sample('aaaaaaaaaaaa', { a: 1 }), sample('bbbbbbbbbbbb', { a: 'x' }))
    expect(result.left.code.html).toContain('export type VideoInfo_V0 = {')
    // 这份源码永远不落盘，贴上那句文件头会把人指向一个不存在的文件
    expect(result.left.code.html).not.toContain('自动生成')
    expect(result.diffs).toEqual([{ path: 'a', kind: 'type', left: 'number', right: 'string' }])
  })
})

describe('喂给生成器的是哪一层、哪些样本', () => {
  it('有 `normalized` 时比的是那一层 —— 与产物描述的是同一层数据（照 `plan.ts:70`）', async () => {
    const left = { ...sample('aaaaaaaaaaaa', { code: 0, data: { title: '标题' } }), normalized: { title: '标题' } }
    const right = { ...sample('bbbbbbbbbbbb', { code: 0, data: { title: '标题', extra: 1 } }), normalized: { title: '标题' } }
    const result = await run(left, right)
    // 两份 raw 的形状是不同的，而归一化后那一层一模一样 —— 报出来必须是零差异
    expect(result.diffs).toEqual([])
    expect(result.same).toBe(1)
    // 平台信封没进类型：`code` 一个字都不该出现在源码里
    expect(result.left.code.html).not.toContain('code')
  })

  /**
   * 走 `planCorpusTypes` 的话这一边**一个文件都不产**（`plan.ts:166` 把 `verdict.kind !== 'store'`
   * 的样本整份跳过），于是面板会是空的 —— 而「拿 `code: -404` 那份看看错误形状长什么样」
   * 正是 PRD 3.2 留下那条 `deleted` 记录的全部目的。这条用例就是 `compare.ts` 不走那条路的判据。
   */
  it('**`store-as-error` 的样本照样能比** —— 那正是「看 code 非 0 时 data 是什么」这个用途', async () => {
    const result = await run(
      sample('aaaaaaaaaaaa', { code: 0, data: { title: '标题' } }),
      sample('bbbbbbbbbbbb', { code: -404, data: null }, 'store-as-error')
    )
    expect(result.diffs).toEqual([
      { path: 'data', kind: 'type', left: 'Data', right: 'null' },
      { path: 'data.title', kind: 'only-left', left: 'string' }
    ])
    expect(result.right.code.html).toContain('data: null')
  })

  it('同一份样本传两遍在这一层是一份全 `same` 的空清单 —— 拒不拒是路由的政策', async () => {
    const one = sample('aaaaaaaaaaaa', { a: 1, b: { c: 'x' } })
    const result = await run(one, one)
    expect(result.diffs).toEqual([])
    expect(result.same).toBe(result.left.fields)
  })
})

describe('按 sampleHash 挑样本', () => {
  it('挑得到就是那一份；挑不到回 `undefined` 而不是抛 —— 说清是哪一边挑不到是路由的事', () => {
    const samples = [sample('aaaaaaaaaaaa', { a: 1 }), sample('bbbbbbbbbbbb', { a: 2 })]
    expect(pickSample(samples, 'bbbbbbbbbbbb')?.raw).toEqual({ a: 2 })
    expect(pickSample(samples, 'cccccccccccc')).toBeUndefined()
    // 这个端点一份样本都还没录 —— 路由那边靠它说出「现有的是：」后面那句空话
    expect(pickSample([], 'aaaaaaaaaaaa')).toBeUndefined()
  })
})
