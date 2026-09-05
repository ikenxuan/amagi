/**
 * `buildOutcome` —— 「拿到原始响应之后的全部判断」那一层。
 *
 * 这个文件的存在本身是这一轮的一个结论：同一套逻辑在 `curate-corpus.mts`（已删的那个脚本）
 * 里活了好几轮，**一条测试都没有** —— `vitest.config.ts` 的 include 覆盖不到 `scripts/`。
 * 搬进 `packages/web` 时把纯的那部分拆了出来，于是它可以被测 —— 时钟、随机数、
 * 已入库样本全从参数进来，不用 mock 任何全局，也不发一个请求。
 */

import { createCorpusSample, type CorpusSample, createScrubSession, type JsonValue } from '@ikenxuan/amagi-typegen'
import { describe, expect, it } from 'vitest'

import { buildOutcome, lineDiff } from '../server/outcome'

const NOW = new Date('2026-09-04T00:00:00Z')

/** 固定 id，好断言 —— 真实实现是时间戳 + 计数器 */
const newId = () => 'test-id'

const base = {
  platform: 'kuaishou',
  endpoint: 'videoWork',
  params: { photoId: '3xabc' } as Record<string, JsonValue>,
  http: { status: 200 },
  amagiVersion: '7.0.0',
  stored: [] as CorpusSample[],
  now: NOW,
  newId
}

/** 造一份已入库样本，当 diff 的「之前」那一半 */
const stored = (raw: JsonValue, extra?: { params?: Record<string, JsonValue>; normalized?: JsonValue }): CorpusSample => {
  const created = createCorpusSample({
    platform: 'kuaishou',
    endpoint: 'videoWork',
    params: extra?.params ?? { photoId: '3xold' },
    raw,
    ...(extra?.normalized === undefined ? {} : { normalized: extra.normalized }),
    http: { status: 200 },
    amagiVersion: '7.0.0',
    recordedAt: NOW
  })
  if (!('sample' in created)) throw new Error(`预期入库，实际被拒：${created.verdict.reason}`)
  return created.sample
}

/**
 * 两层类型的产物源码。**格式必须与生成器一致** —— `flattenTypeSource` 只认
 * 「每个属性一行、两格缩进、类型表达式在冒号后面」，不做通用 TS 解析。
 *
 * 故意做成两层：顶层只有 `data: <子类型>`，属性都挂在子类型上，
 * 于是路径是 `data.xxx` —— 那才是这套判据要证明的东西（路径级、跨类型）。
 */
const typeSource = (props: readonly string[], dataName = 'Data'): string =>
  ['// 自动生成，手改无意义', 'export type VideoWork_V0 = {', `  data: ${dataName}`, '}', '', `type ${dataName} = {`, ...props, '}'].join(
    '\n'
  )

describe('入库判定', () => {
  it('正常响应给 pendingId 与待定条目', () => {
    const { outcome, pending } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } } })
    expect(outcome.ok).toBe(true)
    expect(outcome.pendingId).toBe('test-id')
    expect(pending?.path).toContain('corpus/kuaishou/videoWork/')
    expect(pending?.json).toContain('"platform": "kuaishou"')
  })

  it('风控页被拒，而且**连 pendingId 都没有** —— 「入库」这条路在类型上就不存在', () => {
    const { outcome, pending } = buildOutcome({ ...base, raw: { result: 2 } })
    expect(outcome.ok).toBe(false)
    expect(outcome.verdict.kind).toBe('reject')
    expect(outcome.pendingId).toBeUndefined()
    expect(pending).toBeUndefined()
  })

  it('HTTP 非 2xx 直接拒 —— 那不是业务响应', () => {
    const { outcome } = buildOutcome({ ...base, raw: { result: 1 }, http: { status: 503, statusText: 'Service Unavailable' } })
    expect(outcome.verdict.kind).toBe('reject')
    expect(outcome.verdict.reason).toContain('503')
  })

  it('判定器没有依据时标 confident: false，不假装通过', () => {
    // 没登记业务码的平台名 —— 判定器查不到码表
    const { outcome } = buildOutcome({ ...base, platform: 'unknown-platform', raw: { anything: 1 } })
    expect(outcome.verdict.kind).toBe('store')
    expect(outcome.verdict.confident).toBe(false)
  })
})

describe('脱敏清单', () => {
  it('只给数量与路径，**一个原值都不带** —— 短值的截断哈希能爆破', () => {
    const { outcome } = buildOutcome({
      ...base,
      raw: { result: 1, photo: { photoId: '3xabc', nickname: '真昵称', coverUrl: 'https://cdn.example.com/a.jpg' } }
    })
    const serialized = JSON.stringify(outcome.scrub)
    expect(outcome.scrub!.replacements).toBeGreaterThan(0)
    expect(serialized).not.toContain('真昵称')
    expect(serialized).not.toContain('cdn.example.com')
  })

  it('响应面板里的 payload 是**脱敏后**的（那是要显示给人看的东西）', () => {
    // 用 `nickname` 而不是 `caption`：前者在脱敏规则的正则里，后者**不在** ——
    // 那是脱敏器现在的一个真实缺口（快手作品文案原样进了样本），已单独记账。
    // 这条测试要验的是「payload 走的是脱敏后那一份」这条接线，不是规则覆盖率
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { nickname: '真昵称' } } })
    expect(JSON.stringify(outcome.payload)).not.toContain('真昵称')
  })

  it('有 normalized 时 payload 用它 —— 类型描述的是归一化后那一层（PRD 待决 #2）', () => {
    const { outcome } = buildOutcome({
      ...base,
      raw: { result: 1, photo: { photoId: '3xabc' } },
      normalized: { title: '标题', durationMs: 1000 }
    })
    expect(outcome.payload).toHaveProperty('durationMs')
    // 平台信封的 `result` 不该出现 —— 它不是 fetcher 返回的东西
    expect(outcome.payload).not.toHaveProperty('result')
  })

  it('一批样本共用 scrub session 时，同一原值换出同一假值（跨样本引用一致性）', () => {
    const session = createScrubSession()
    const first = buildOutcome({ ...base, raw: { result: 1, photo: { nickname: '同一个人' } }, scrub: { session } })
    const second = buildOutcome({
      ...base,
      params: { photoId: '3xdef' },
      raw: { result: 1, photo: { nickname: '同一个人' } },
      scrub: { session }
    })
    const nicknameOf = (payload: JsonValue | undefined) => ((payload as { photo?: { nickname?: string } }).photo ?? {}).nickname
    expect(nicknameOf(first.outcome.payload)).toBe(nicknameOf(second.outcome.payload))
  })
})

describe('类型 diff', () => {
  it('第一份样本：diff 里全是新增行', () => {
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } } })
    expect(outcome.diff!.length).toBeGreaterThan(0)
    expect(outcome.diff!.every((line) => line.sign === '+')).toBe(true)
    // 字段级判据报的是**路径**，不是行。类型名在 `file` 里（`…/VideoWork/VideoWork_V0.ts`）
    expect(outcome.diff!.some((line) => line.text.includes('`photo.photoId` 新增'))).toBe(true)
    expect(outcome.diff!.some((line) => line.file.endsWith('VideoWork_V0.ts'))).toBe(true)
  })

  it('同形样本 `shapeChanged: false` —— **这正是「这份可以丢掉」的判据**', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' } })
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } }, stored: [already] })
    expect(outcome.shapeChanged).toBe(false)
    // **diff 现在是空的**，换成字段级判据之前它不是：产物文件头里有溯源块，多录一份样本
    // 必然多两行注释，那时 diff 非空、靠 `isShapeLine` 把注释滤掉才敢说 `shapeChanged: false`。
    // 现在注释在类型声明文件上压根不产 diff 行 —— 判据与面板上显示的第一次是同一件事
    expect(outcome.diff).toEqual([])
  })

  it('带来新字段时 `shapeChanged: true`', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' } })
    const { outcome } = buildOutcome({
      ...base,
      raw: { result: 1, photo: { photoId: '3xabc' }, brandNewField: 42 },
      stored: [already]
    })
    expect(outcome.shapeChanged).toBe(true)
  })

  it('第一份样本也算带来新形状（整个类型文件是新的）', () => {
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } } })
    expect(outcome.shapeChanged).toBe(true)
  })

  it('新字段出现在 diff 里，而且带文件路径（前端要按文件分组显示）', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' } })
    const { outcome } = buildOutcome({
      ...base,
      raw: { result: 1, photo: { photoId: '3xabc' }, brandNewField: 42 },
      stored: [already]
    })
    const added = outcome.diff!.filter((line) => line.sign === '+')
    expect(added.some((line) => line.text.includes('brandNewField'))).toBe(true)
    expect(added.every((line) => line.file.endsWith('.ts'))).toBe(true)
  })

  it('根类型摊不出字段时整份文件回落到行差，而注释行照旧不算形状（`guards.ts` / barrel 走的就是这条）', () => {
    // 归一化成数组的端点（列表类 fetcher 直接回数组）：根类型是 `number[]`，一个属性都没有，
    // 字段级判据在它上面说不出话 —— 于是回落到行差，而它头上的溯源块每多一份样本就多两行注释。
    // `guards.ts` 与各层 barrel 是同一条路，只是构造它们要一个能自动发现判别式的样本集
    const list: JsonValue = [1, 2, 3]
    const already = stored({ result: 1 }, { normalized: list })
    const { outcome } = buildOutcome({ ...base, raw: { result: 1 }, normalized: list, stored: [already] })
    expect(outcome.diff!.length).toBeGreaterThan(0)
    expect(outcome.diff!.every((line) => line.text.trim().startsWith('//'))).toBe(true)
    expect(outcome.shapeChanged).toBe(false)
  })

  it('破坏性变更只留会让下游编译红的那些', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' } })
    // 新样本少了 `photo` —— 已声明的字段变可选，对读的一侧是破坏性的
    const { outcome } = buildOutcome({ ...base, raw: { result: 1 }, stored: [already] })
    expect(outcome.breaking!.length).toBeGreaterThan(0)
  })
})

describe('lineDiff（判据是字段级的，不是行集合差）', () => {
  it('`string` → `string | null` 报成 `type`，而且**两侧的值都在那句话里**', () => {
    expect(lineDiff(typeSource(['  desc: string']), typeSource(['  desc: string | null']))).toEqual([
      { sign: '+', text: '`data.desc` 的类型从 `string` 变成 `string | null`' }
    ])
  })

  it('键消失报 `-`、键新增报 `+`（`only-handwritten` / `only-generated`）', () => {
    const before = typeSource(['  desc: string', '  gone: number'])
    const after = typeSource(['  desc: string', '  fresh: boolean'])
    // 按路径排序，所以 `fresh` 在 `gone` 前面
    expect(lineDiff(before, after)).toEqual([
      { sign: '+', text: '`data.fresh` 新增，类型 `boolean`' },
      { sign: '-', text: '`data.gone` 不再出现（原本 `number`）' }
    ])
  })

  it('**同一行文本在别处还在时，行集合差会漏报** —— 这是换掉它的真正理由', () => {
    // 两个类型都有 `  id: number`，而 `Extra` 那个换成了 `name`。行集合差比的是**行的集合**，
    // 于是「`data.extra.id` 没了」在集合上看不出来（那一行在 `Data` 里还在），
    // 它只会报一条新增 —— 而漏报正是 `shapeChanged` 会说谎的方向（人照着把有价值的样本丢掉）。
    // 字段级判据按路径比，两条都报
    const source = (extraProp: string): string =>
      [
        'export type VideoWork_V0 = {',
        '  data: Data',
        '}',
        '',
        'type Data = {',
        '  id: number',
        '  extra: Extra',
        '}',
        '',
        'type Extra = {',
        `  ${extraProp}`,
        '}'
      ].join('\n')
    expect(lineDiff(source('id: number'), source('name: string'))).toEqual([
      { sign: '-', text: '`data.extra.id` 不再出现（原本 `number`）' },
      { sign: '+', text: '`data.extra.name` 新增，类型 `string`' }
    ])
  })

  it('可选性变化报成 `optionality` —— 类型一个字没变也要报', () => {
    expect(lineDiff(typeSource(['  desc: string']), typeSource(['  desc?: string']))).toEqual([
      { sign: '+', text: '`data.desc` 从必需变成可选' }
    ])
  })

  it('**子类型改名不误报** —— 判据是路径，引用被归一成 `↦`（`FlatField.shape`）', () => {
    expect(lineDiff(typeSource(['  desc: string'], 'Data'), typeSource(['  desc: string'], 'DataPayload'))).toEqual([])
  })

  it('只有注释变了 ⇒ 一条差异都没有（溯源块每多一份样本必然多两行）', () => {
    const withDoc = (doc: string) => typeSource([`  /** ${doc} */`, '  desc: string'])
    expect(lineDiff(withDoc('原来那句'), withDoc('改过的那句'))).toEqual([])
  })

  it('完全相同就没有差异', () => {
    expect(lineDiff(typeSource(['  desc: string']), typeSource(['  desc: string']))).toEqual([])
  })

  it('barrel 这种非类型声明回落到行差 —— 跳过的话「这个文件变了」会静默消失', () => {
    const barrel = "export type { VideoWork_V0 } from './VideoWork_V0'\n"
    expect(lineDiff('', barrel)).toEqual([{ sign: '+', text: "export type { VideoWork_V0 } from './VideoWork_V0'" }])
  })

  it('回落的那条路仍然是行集合差：增删各归各的，空行不算', () => {
    expect(lineDiff('a\n\nb', 'a\nc')).toEqual([
      { sign: '+', text: 'c' },
      { sign: '-', text: 'b' }
    ])
  })

  it('回落时注释行还是注释行 —— `shapeChanged` 靠这一点把 `guards.ts` 的溯源块滤掉', () => {
    const guards = (evidence: string) =>
      [
        '// 自动生成，手改无意义',
        '//',
        `// 证据：${evidence}`,
        '',
        "import type { Ok } from './ok'",
        'export type VideoWorkDiscriminant =',
        "  | 'ok'"
      ].join('\n')
    const lines = lineDiff(guards('1 份样本'), guards('2 份样本'))
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((line) => line.text.trim().startsWith('//'))).toBe(true)
  })

  it('**返回结构化的 sign，不拼字符串** —— 正文里含 ` - ` 的行按子串猜会被误判成删除行', () => {
    const [line] = lineDiff('', '  /** 时长 - 秒 */')
    expect(line).toEqual({ sign: '+', text: '  /** 时长 - 秒 */' })
  })
})

describe('确定性（同一批输入产出同一个结果）', () => {
  it('两次调用产出逐字节相同的 outcome', () => {
    const input = { ...base, raw: { result: 1, photo: { photoId: '3xabc' } } as JsonValue }
    expect(JSON.stringify(buildOutcome(input).outcome)).toBe(JSON.stringify(buildOutcome(input).outcome))
  })

  it('已入库样本的顺序不影响 diff', () => {
    const a = stored({ result: 1, photo: { photoId: '3xa' } })
    const b = stored({ result: 1, photo: { photoId: '3xb' }, extra: 1 })
    const forward = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } }, stored: [a, b] })
    const reversed = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } }, stored: [b, a] })
    expect(forward.outcome.diff).toEqual(reversed.outcome.diff)
  })
})
