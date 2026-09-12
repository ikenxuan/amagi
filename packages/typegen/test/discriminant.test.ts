import { describe, expect, it } from 'vitest'

import {
  buildCoverage,
  emitDiscriminatedUnion,
  findDiscriminants,
  groupSamplesByDiscriminant,
  type JsonValue,
  pickDiscriminant
} from '../src/index'
import { ALL_SEVEN, NOT_DISCRIMINANT, SAMPLE_AV, SAMPLE_AV_2, SAMPLE_DRAW } from './fixtures/dynamic-six-types'

/**
 * 判别式发现与 `is*` 守卫生成。
 *
 * 判据来自两处实测事实，不是设计偏好：
 *
 * 1. **判别式在第三层**（`data.item.type`），不在联合成员顶层 —— PRD 硬约束 2。
 *    发现器不能假设判别式在根上。
 * 2. **嵌套判别式的 `if` 判断不收窄**，只有类型谓词能收窄 ——
 *    `packages/core/test/types/discriminant-narrowing.test-d.ts` 实测过。
 *    所以守卫函数不是锦上添花，是判别联合能被下游用起来的**唯一**途径。
 *
 * 样本是从 `packages/core/src/types/ReturnDataType/Bilibili/Dynamic/` 下现有的 6 个
 * `DYNAMIC_TYPE_*` 反推的（精简，但判别式与各自的独占键保真）。
 */

/** 取端点目录下所有产物路径，排序后比对 */
const filesOf = (result: { files: Map<string, string> }): string[] => [...result.files.keys()].sort()

describe('判别式发现：认出第三层的 data.item.type', () => {
  const candidates = findDiscriminants(ALL_SEVEN)

  it('data.item.type 是候选，且是首选（浅的优先）', () => {
    const picked = pickDiscriminant(candidates)
    expect(picked?.path).toBe('data.item.type')
    expect(picked?.key).toBe('type')
    expect(picked?.containerPath).toBe('data.item')
  })

  it('六个取值一个不少（七份样本，AV 重复一份），顺序固定（确定性）', () => {
    const picked = pickDiscriminant(candidates)
    expect(picked?.values.map((v) => v.value)).toEqual([
      'DYNAMIC_TYPE_ARTICLE',
      'DYNAMIC_TYPE_AV',
      'DYNAMIC_TYPE_DRAW',
      'DYNAMIC_TYPE_FORWARD',
      'DYNAMIC_TYPE_LIVE_RCMD',
      'DYNAMIC_TYPE_WORD'
    ])
  })

  it('递归那份的 orig.type 也被认出来，但更深所以落选', () => {
    const nested = candidates.find((c) => c.path === 'data.item.orig.type')
    // 只有 FORWARD 一份有 orig，所以它是个真实但样本极少的候选 —— 看得见、不选它
    if (nested) expect(nested.depth).toBeGreaterThan(pickDiscriminant(candidates)!.depth)
    expect(pickDiscriminant(candidates)?.path).toBe('data.item.type')
  })

  it('取值有限但键集合相同的字段**不是**判别式', () => {
    const picked = pickDiscriminant(findDiscriminants(NOT_DISCRIMINANT))
    // `kind` 只有 a / b 两个取值，但两种取值下 title / count 都在 —— 分离度为 0
    expect(picked?.key).not.toBe('kind')
  })

  it('样本顺序不影响候选与取值顺序（产物要提交进 git 跑 --check）', () => {
    const reversed = findDiscriminants([...ALL_SEVEN].reverse())
    expect(reversed.map((c) => c.path)).toEqual(candidates.map((c) => c.path))
    expect(pickDiscriminant(reversed)?.values.map((v) => v.value)).toEqual(pickDiscriminant(candidates)?.values.map((v) => v.value))
  })

  it('每个取值只出现一次的候选一个都不选 —— 那种「判别式」没有信息量', () => {
    // 两份样本、两个变体，形状确实不同，但每个取值只有一份样本：
    // 此时 `id` 这种自由字段与真判别式 `type` 完全同分（每份样本自成一组，分离度必然满分）。
    // 与其挑一个然后按样本数产出一堆「一份样本一个类型」的文件，不如先产一个合并类型。
    const undersampled: JsonValue[] = [
      { data: { item: { id: 'a', type: 'AV', archive: {} } } },
      { data: { item: { id: 'b', type: 'DRAW', pics: [] } } }
    ]
    expect(findDiscriminants(undersampled).length).toBeGreaterThan(0)
    expect(pickDiscriminant(findDiscriminants(undersampled))).toBeUndefined()
  })

  it('**一整片字段同分时一个都不选** —— 排第一那个只是路径字典序的产物', () => {
    // 实测踩到的那一个（抖音 `parseWork` 3 份成功样本）：`activity_video_type`（活动视频的
    // 标记位，取值 -1 / 0）与 `authentication_token`、`author_user_id` 这些纯自由字段
    // **完全同分** —— 25 个候选并列第一。那说明这批样本上谁都不是判别式，而旧判据会挑走
    // 排序第一的那个，产出 `ParseWork/-1/` 与 `ParseWork/0/` 两棵几乎一样的目录树。
    //
    // 这里用两份样本 + 一堆同分的自由字段复现那个形状：每个字段都只把两份样本分开一次，
    // 没有任何一个字段真的在划分形状。
    const fields = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`free_${index}`, `a${index}`]))
    const tied: JsonValue[] = [
      { data: { item: { flag: -1, ...fields, only_a: 1 } } },
      { data: { item: { flag: -1, ...fields, only_a: 1 } } },
      { data: { item: { flag: 0, ...Object.fromEntries(Object.keys(fields).map((key) => [key, 'b'])), only_b: 2 } } },
      { data: { item: { flag: 0, ...Object.fromEntries(Object.keys(fields).map((key) => [key, 'b'])), only_b: 2 } } }
    ]
    const candidates = findDiscriminants(tied)
    // 前提先钉住：同分的候选真的是一整片（否则下面那句成了不测任何东西的断言）
    expect(candidates.filter((entry) => !entry.insideArray).length).toBeGreaterThan(3)
    expect(pickDiscriminant(candidates)).toBeUndefined()
  })

  it('**首选不合格时不往后顺延** —— 顺延只会换一个更糟的误判', () => {
    // 实测踩到的第二次（同一个抖音 `parseWork`）：`tie` 那道闸挡住了排第一的
    // `activity_video_type`，而 `pickDiscriminant` 用的是 `find` —— 它继续往后找，
    // 一直找到 `aweme_detail.video.play_addr.uri`（更深、tie 更小），于是产出
    // `ParseWork/1080/` 与 `ParseWork/720/`。比原来那个还糟：uri 是纯自由字段。
    //
    // 判别式**只有一个首选**：排序第一那个不合格，说明这批样本上没有可用的判别式，
    // 而不是「第二名可以凑」。
    const wide = (flag: number, tag: string, extra: Record<string, JsonValue>, deep: Record<string, JsonValue>): JsonValue => ({
      data: {
        item: {
          flag,
          ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`free_${index}`, `${tag}${index}`])),
          ...extra,
          deep
        }
      }
    })
    const tied: JsonValue[] = [
      wide(-1, 'a', { only_a: 1 }, { uri: 'x', only_x: 1 }),
      wide(-1, 'a', { only_a: 1 }, { uri: 'x', only_x: 1 }),
      wide(0, 'b', { only_b: 2 }, { uri: 'y', only_y: 2 })
    ]
    const candidates = findDiscriminants(tied)
    // 前提有两半，缺一半这条就测不到「顺延」：浅的那一层是同分的一整片（会被 tie 挡掉），
    // 而更深那一层有一个 tie 很小的自由字段（旧实现正是顺延到它）
    expect(candidates.filter((entry) => entry.depth === 3).length).toBeGreaterThan(3)
    expect(candidates.some((entry) => entry.path === 'data.item.deep.uri')).toBe(true)
    expect(pickDiscriminant(candidates)).toBeUndefined()
  })

  it('同一个变体有两份样本，判别式就选得出来了（这就是「每个变体至少两份」的含义）', () => {
    const enough: JsonValue[] = [
      { data: { item: { id: 'a', type: 'AV', archive: {} } } },
      { data: { item: { id: 'b', type: 'AV', archive: {} } } },
      { data: { item: { id: 'c', type: 'DRAW', pics: [] } } },
      { data: { item: { id: 'd', type: 'DRAW', pics: [] } } }
    ]
    expect(pickDiscriminant(findDiscriminants(enough))?.key).toBe('type')
  })
})

describe('按判别式分组', () => {
  it('七份样本分成六组（AV 两份）', () => {
    const grouped = groupSamplesByDiscriminant(ALL_SEVEN, 'data.item.type')
    expect(grouped.groups).toHaveLength(6)
    // AV 有两份，其余各一份 —— 合计 7
    expect(grouped.groups.reduce((n, g) => n + g.samples.length, 0)).toBe(7)
  })

  it('路径上取不到字面量的样本被单独记出来，不静默丢掉', () => {
    const grouped = groupSamplesByDiscriminant([...ALL_SEVEN, { data: { item: {} } }], 'data.item.type')
    expect(grouped.groups).toHaveLength(6)
    expect(grouped.unmatched).toHaveLength(1)
  })
})

describe('落盘路径与产物形状', () => {
  const result = emitDiscriminatedUnion(ALL_SEVEN, { endpoint: 'Dynamic', unionName: 'BiliDynamicInfoUnion', banner: false })

  it('目录约定：<Endpoint>/<判别式字面量>/<判别式字面量>_V0.ts + barrel', () => {
    const files = filesOf(result)
    expect(files).toContain('Dynamic/DYNAMIC_TYPE_AV/DYNAMIC_TYPE_AV_V0.ts')
    expect(files).toContain('Dynamic/DYNAMIC_TYPE_AV/index.ts')
    expect(files).toContain('Dynamic/DYNAMIC_TYPE_FORWARD/DYNAMIC_TYPE_FORWARD_V0.ts')
  })

  it('每个取值只产一个 _V0 —— 一份样本不可能有「无法合并的形状差异」', () => {
    for (const member of result.members) {
      expect(member.shapes).toHaveLength(1)
      expect(member.shapes[0].index).toBe(0)
    }
    expect(filesOf(result).filter((f) => /_V[1-9]/.test(f))).toHaveLength(0)
  })

  it('六个成员都在，守卫名按取值派生', () => {
    expect(result.members.map((m) => m.guardName).sort()).toEqual([
      'isDynamicTypeAV',
      'isDynamicTypeArticle',
      'isDynamicTypeDraw',
      'isDynamicTypeForward',
      'isDynamicTypeLiveRcmd',
      'isDynamicTypeWord'
    ])
  })

  it('产物是纯函数：样本顺序不影响文件清单与内容', () => {
    const reversed = emitDiscriminatedUnion([...ALL_SEVEN].reverse(), {
      endpoint: 'Dynamic',
      unionName: 'BiliDynamicInfoUnion',
      banner: false
    })
    expect(filesOf(reversed)).toEqual(filesOf(result))
    for (const file of filesOf(result)) expect(reversed.files.get(file)).toBe(result.files.get(file))
  })
})

describe('兜底支（开放联合）', () => {
  const result = emitDiscriminatedUnion(ALL_SEVEN, { endpoint: 'Dynamic', banner: false })
  const source = result.files.get('Dynamic/Unknown.ts') ?? ''

  it('默认产一支，并进判别联合', () => {
    expect(result.fallback?.file).toBe('Dynamic/Unknown.ts')
    expect(result.fallback?.typeName).toBe('DynamicUnknown')
    const guards = result.files.get('Dynamic/guards.ts') ?? ''
    expect(guards).toContain('| DynamicUnknown')
  })

  it('判别字段渲染成 `?: never`（写成 `type: string` 会把裸 if 的收窄退化成 any）', () => {
    // 只看类型体，别被文件头的说明文字干扰 —— 那段里恰好也提到 `type: string` 这个反例
    const item = source.slice(source.indexOf('type Item = '))
    expect(item).toContain('type?: never')
  })

  it('信封的原始类型字段留着，容器内部只留判别字段', () => {
    expect(source).toContain('code: number')
    expect(source).toContain('message: string')
    expect(source).toContain('ttl: number')
    // 业务字段一个都不该出现：兜底支接的是没见过的类型，对它不作任何承诺
    expect(source).not.toContain('id_str')
    expect(source).not.toContain('module_author')
    expect(source).not.toContain('DYNAMIC_TYPE_')
  })

  it('不进判别式取值联合，也不给它产守卫（它没有取值可比）', () => {
    const guards = result.files.get('Dynamic/guards.ts') ?? ''
    const literals = guards.slice(guards.indexOf('export type DynamicDiscriminant'), guards.indexOf('export type DynamicUnion'))
    expect(literals).not.toContain('Unknown')
    expect(guards).not.toContain('isDynamicUnknown')
  })

  it('openUnion: false 退回不产（老行为，给不想要这一支的端点留的口子）', () => {
    const closed = emitDiscriminatedUnion(ALL_SEVEN, { endpoint: 'Dynamic', banner: false, openUnion: false })
    expect(closed.fallback).toBeUndefined()
    expect(closed.files.has('Dynamic/Unknown.ts')).toBe(false)
  })
})

describe('is* 守卫：嵌套判别式唯一能收窄的形式', () => {
  const result = emitDiscriminatedUnion(ALL_SEVEN, { endpoint: 'Dynamic', unionName: 'BiliDynamicInfoUnion', banner: false })
  const guards = result.files.get(result.guardsFile) ?? ''

  it('守卫文件产出来了', () => {
    expect(result.guardsFile).toBe('Dynamic/guards.ts')
    expect(guards).not.toBe('')
  })

  it('谓词形状是 `info is Extract<联合, { 判别式路径 }>` —— 沿路径嵌套，不是顶层键', () => {
    expect(guards).toContain('isDynamicTypeAV')
    expect(guards).toContain('info is Extract<BiliDynamicInfoUnion,')
    // 路径是 data.item.type，所以 Extract 的模式必须一层层嵌下去
    expect(guards).toMatch(/data:\s*\{\s*item:\s*\{\s*type:\s*'DYNAMIC_TYPE_AV'\s*\}\s*\}/)
  })

  it('六个取值各一个谓词', () => {
    for (const member of result.members) expect(guards).toContain(member.guardName)
  })
})

describe('覆盖率报告', () => {
  it('报出每个取值的样本数与占比', () => {
    const result = emitDiscriminatedUnion(ALL_SEVEN, { endpoint: 'Dynamic', banner: false })
    expect(result.coverage.values).toHaveLength(6)
    expect(result.coverage.sampleCount).toBe(7)
    expect(result.coverage.values.reduce((n, v) => n + v.samples, 0)).toBe(7)
  })

  it('传了已声明的枚举清单，就报出「声明了却从未出现」的成员', () => {
    const result = emitDiscriminatedUnion([SAMPLE_AV, SAMPLE_AV_2, SAMPLE_DRAW], {
      endpoint: 'Dynamic',
      banner: false,
      declaredValues: ['DYNAMIC_TYPE_AV', 'DYNAMIC_TYPE_DRAW', 'DYNAMIC_TYPE_UGC_SEASON']
    })
    // 这正是「MajorType 已声明 17 种，实测出现 9 种」要的那个数
    expect(result.coverage.declaredMissing).toEqual(['DYNAMIC_TYPE_UGC_SEASON'])
  })

  it('没传清单就只报出现过的，不凭空说谁缺席', () => {
    const coverage = buildCoverage({
      path: 'data.item.type',
      groups: groupSamplesByDiscriminant([SAMPLE_AV, SAMPLE_AV_2], 'data.item.type').groups,
      sampleCount: 2
    })
    expect(coverage.declaredMissing).toEqual([])
  })
})

/**
 * 判别式钉死之后**失效**了（平台改了字段名、路径写错、路径落在数组里）。
 *
 * 这一族的判据只有一条：**产不出完整的一支，就一个文件都别产**。半个产物比没有产物贵 ——
 * 空联合的 `guards.ts`（`export type XDiscriminant =` 后面什么都没有）是语法错误，
 * 而调用方（`plan.ts`）还会照样往平台 barrel 里写一条指向它的 export，于是整棵树编译不过。
 */
describe('判别式失效：不产，比产一个坏产物好', () => {
  it('路径在所有样本上都读不到 → 一个文件都不产，而不是产一个空联合的 guards.ts', () => {
    const result = emitDiscriminatedUnion(ALL_SEVEN, { endpoint: 'Dynamic', discriminantPath: 'data.item.kind', banner: false })
    expect(result.members).toEqual([])
    expect(filesOf(result)).toEqual([])
    expect(result.blocked).toContain('data.item.kind')
  })

  it('路径含 `[]` 时也走同一条早退，理由同样落在 blocked 里', () => {
    const result = emitDiscriminatedUnion(ALL_SEVEN, { endpoint: 'Dynamic', discriminantPath: 'data.items[].type', banner: false })
    expect(filesOf(result)).toEqual([])
    expect(result.blocked).toContain('data.items[].type')
  })

  it('正常产出时 blocked 是 undefined —— 调用方只需要判这一个字段，不用去 notes 里认字符串', () => {
    const result = emitDiscriminatedUnion(ALL_SEVEN, { endpoint: 'Dynamic', banner: false })
    expect(result.blocked).toBeUndefined()
    expect(result.files.size).toBeGreaterThan(0)
  })
})
