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
const stored = (raw: JsonValue): CorpusSample => {
  const created = createCorpusSample({
    platform: 'kuaishou',
    endpoint: 'videoWork',
    params: { photoId: '3xold' },
    raw,
    http: { status: 200 },
    amagiVersion: '7.0.0',
    recordedAt: NOW
  })
  if (!('sample' in created)) throw new Error(`预期入库，实际被拒：${created.verdict.reason}`)
  return created.sample
}

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
    expect(outcome.diff!.some((line) => line.text.includes('VideoWork_V0'))).toBe(true)
  })

  it('同形样本不带来新形状 —— diff 为空。**这正是「这份可以丢掉」的判据**', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' } })
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } }, stored: [already] })
    // 溯源块会多一行（多了一份样本），所以不能断言 diff 完全为空 ——
    // 断言的是**没有类型行变化**：新增的行里不含字段声明
    expect(outcome.diff!.filter((line) => line.text.includes(':')).length).toBe(0)
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

  it('破坏性变更只留会让下游编译红的那些', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' } })
    // 新样本少了 `photo` —— 已声明的字段变可选，对读的一侧是破坏性的
    const { outcome } = buildOutcome({ ...base, raw: { result: 1 }, stored: [already] })
    expect(outcome.breaking!.length).toBeGreaterThan(0)
  })
})

describe('lineDiff', () => {
  it('增删各归各的，空行不算', () => {
    expect(lineDiff('a\n\nb', 'a\nc')).toEqual([
      { sign: '+', text: 'c' },
      { sign: '-', text: 'b' }
    ])
  })

  it('完全相同就没有差异', () => {
    expect(lineDiff('a\nb', 'a\nb')).toEqual([])
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
