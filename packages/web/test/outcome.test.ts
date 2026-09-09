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

import { buildOutcome, lineDiff, parseResponseDirection, rebuildOutcome, receiptBytesOf } from '../server/outcome'

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
const stored = (
  raw: JsonValue,
  extra?: {
    params?: Record<string, JsonValue>
    normalized?: JsonValue
    /** 这份旧样本落在哪个 `_V<n>` 上 —— 「下一个空序号」那套判据要靠它摆场景 */
    shapeIndex?: number
    direction?: 'success' | 'error'
  }
): CorpusSample => {
  const created = createCorpusSample({
    platform: 'kuaishou',
    endpoint: 'videoWork',
    params: extra?.params ?? { photoId: '3xold' },
    raw,
    ...(extra?.normalized === undefined ? {} : { normalized: extra.normalized }),
    ...(extra?.shapeIndex === undefined ? {} : { shapeIndex: extra.shapeIndex }),
    ...(extra?.direction === undefined ? {} : { direction: extra.direction }),
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

  it('direction=error 会进 outcome 与待定样本，且不影响入库判定', () => {
    const { outcome, pending } = buildOutcome({
      ...base,
      direction: 'error',
      raw: { result: 1, photo: { photoId: '3xabc', caption: '内容不重要' } }
    })
    expect(outcome.ok).toBe(true)
    expect(outcome.direction).toBe('error')
    expect(pending?.sample.metadata.direction).toBe('error')
    expect(pending?.json).toContain('"direction": "error"')
  })

  it('不传 direction 时默认 success', () => {
    const { outcome, pending } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } } })
    expect(outcome.direction).toBe('success')
    expect(pending?.sample.metadata.direction).toBe('success')
  })

  it('响应后可以把待定样本从 success 重判成 error，并重算 diff', () => {
    const first = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } } })
    const entry = first.pending!
    const rebuilt = rebuildOutcome({ entry, direction: 'error', stored: [], now: NOW })
    expect(rebuilt.outcome.direction).toBe('error')
    expect(rebuilt.pending.sample.metadata.direction).toBe('error')
    expect(rebuilt.pending.json).toContain('"direction": "error"')
    expect(rebuilt.outcome.diff?.some((line) => line.file.includes('VideoWork_Error_V0.ts'))).toBe(true)
  })

  it('direction 只认 success / error', () => {
    expect(parseResponseDirection('success')).toBe('success')
    expect(parseResponseDirection('error')).toBe('error')
    expect(parseResponseDirection('bad')).toBeUndefined()
    expect(parseResponseDirection(undefined)).toBeUndefined()
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

  it('嵌入原值不再阻断入库：leak 闸已随隐私模型的重新判定删除', () => {
    // 这个工具的请求参数全是公开 ID（视频 ID 这种互联网上直接搜得到的东西），
    // 「残留 ⇒ 不许入库」那道闸由此删除：判定通过 ⇒ `ok` 且有待定条目，
    // scrub 清单只剩数量与 suspects，不再有 leaks / leakItems
    const original = '7319048271650382194'
    const { outcome, pending } = buildOutcome({
      ...base,
      platform: 'douyin',
      raw: { status_code: 0, photo_id: original, embedded: `photoId=${original}` },
      scrub: { keep: [{ key: 'embedded' }] }
    })
    expect(outcome.verdict.kind).toBe('store')
    expect(outcome.ok).toBe(true)
    expect(outcome.pendingId).toBeDefined()
    expect(pending).toBeDefined()
    expect(outcome.scrub).not.toHaveProperty('leaks')
    expect(outcome.scrub).not.toHaveProperty('leakItems')
    expect(JSON.stringify(outcome.scrub)).not.toContain(original)
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

describe('形状序号（`_V<n>` 由人选）穿到 server 这一层', () => {
  it('shapeIndex 会进待存样本，diff 也按它算', () => {
    const already = stored({ result: 1, photo: { video: { url: 'u' } } }, { params: { photoId: '3xold' } })
    const { outcome, pending } = buildOutcome({
      ...base,
      params: { photoId: '3xnew' },
      raw: { result: 1, photo: { images: ['i'] } },
      stored: [already],
      shapeIndex: 1
    })
    expect(pending?.sample.metadata.shapeIndex).toBe(1)
    expect(outcome.shapeIndex).toBe(1)
    // 选了「单独建新形状」⇒ 它不与 `_V0` 合并，于是 diff 里出现的是一个新文件
    expect(outcome.diffFiles!.some((file) => file.file.endsWith('VideoWork_V1.ts'))).toBe(true)
    expect(outcome.diffFiles!.every((file) => !file.file.endsWith('VideoWork_V0.ts'))).toBe(true)
  })

  it('不传时是 0 —— 「合并进现有类型」是常态', () => {
    const { outcome, pending } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xa' } } })
    expect(pending?.sample.metadata.shapeIndex).toBe(0)
    expect(outcome.shapeIndex).toBe(0)
  })

  it('重选形状不重发请求：样本本体不变，只换序号与 diff', () => {
    const already = stored({ result: 1, photo: { video: { url: 'u' } } }, { params: { photoId: '3xold' } })
    const first = buildOutcome({
      ...base,
      params: { photoId: '3xnew' },
      raw: { result: 1, photo: { images: ['i'] } },
      stored: [already]
    })
    const rebuilt = rebuildOutcome({ entry: first.pending!, shapeIndex: 1, stored: [already], now: NOW })
    expect(rebuilt.pending.sample.metadata.shapeIndex).toBe(1)
    expect(rebuilt.pending.json).toContain('"shapeIndex": 1')
    // rawPayload 那些描述「同一发响应」的字段一个都没动
    expect(rebuilt.outcome.rawPayload).toEqual(first.outcome.rawPayload)
    expect(rebuilt.outcome.diffFiles!.some((file) => file.file.endsWith('VideoWork_V1.ts'))).toBe(true)
  })
})

/**
 * **「单独建新形状」落到哪个序号，由 server 算。**
 *
 * 界面上那两档只表达意图（合并 / 分开），而「分开」到底是 `_V1` 还是 `_V7` 取决于**盘上有什么** ——
 * 只有 server 读得到 corpus。前端写死 1 的后果是：这个端点已经有一份 `_V1` 时，
 * 选「单独建新形状」会**静默合并进那一份**，而界面上写着「新形状」。
 *
 * 所以 `nextShapeIndex` 跟着每份 outcome 回去，前端把它原样送回来（`/api/direction`）。
 */
describe('nextShapeIndex：「单独建新形状」该落到哪个序号', () => {
  it('一份非 0 序号都没有时是 1', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' } })
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } }, stored: [already] })
    expect(outcome.nextShapeIndex).toBe(1)
  })

  it('盘上已有 `_V1` 时是 2 —— 写死 1 会静默合并进那一份', () => {
    const v0 = stored({ result: 1, photo: { photoId: '3xold' } })
    const v1 = stored({ result: 1, photo: { images: ['i'] } }, { params: { photoId: '3xv1' }, shapeIndex: 1 })
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } }, stored: [v0, v1] })
    expect(outcome.nextShapeIndex).toBe(2)
  })

  it('**中间空出来的序号先填**：有 `_V0` 与 `_V2` 时下一个是 1 —— 联合里不留洞', () => {
    const v0 = stored({ result: 1, photo: { photoId: '3xold' } })
    const v2 = stored({ result: 1, photo: { live: true } }, { params: { photoId: '3xv2' }, shapeIndex: 2 })
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } }, stored: [v0, v2] })
    expect(outcome.nextShapeIndex).toBe(1)
  })

  it('**按方向各算一套**：成功那侧的 `_V1` 不占用错误那侧的 1', () => {
    // `plan.ts` 里 successByIndex / errorByIndex 是两个 Map，序号在两侧是两套命名空间
    const successV1 = stored({ result: 1, photo: { images: ['i'] } }, { params: { photoId: '3xv1' }, shapeIndex: 1 })
    const { outcome } = buildOutcome({
      ...base,
      direction: 'error',
      raw: { result: 1, photo: { photoId: '3xabc' } },
      stored: [successV1]
    })
    expect(outcome.nextShapeIndex).toBe(1)
  })

  it('**排掉被这一发覆盖的那份** —— 重选「单独建新形状」不会一路递增', () => {
    // 同一组参数录第二次是覆盖（文件名就是参数哈希）。盘上那份自己占着 `_V1` 时，
    // 「下一个空序号」仍该是 1 —— 否则人每点一次「单独建新形状」序号就爬一格
    const params = { photoId: '3xsame' }
    const mine = stored({ result: 1, photo: { images: ['i'] } }, { params, shapeIndex: 1 })
    const { outcome } = buildOutcome({ ...base, params, raw: { result: 1, photo: { images: ['i', 'j'] } }, stored: [mine] })
    expect(outcome.nextShapeIndex).toBe(1)
  })

  it('重算形状之后这个数仍然是稳定的 —— 连点两次「单独建新形状」落在同一格', () => {
    const v0 = stored({ result: 1, photo: { photoId: '3xold' } })
    const first = buildOutcome({ ...base, raw: { result: 1, photo: { images: ['i'] } }, stored: [v0] })
    expect(first.outcome.nextShapeIndex).toBe(1)
    const rebuilt = rebuildOutcome({ entry: first.pending!, shapeIndex: first.outcome.nextShapeIndex!, stored: [v0], now: NOW })
    expect(rebuilt.outcome.shapeIndex).toBe(1)
    // 再点一次：算出来的仍是 1（自己那份不算在「已占用」里），不会爬到 2
    expect(rebuilt.outcome.nextShapeIndex).toBe(1)
  })
})

describe('重发同一组参数也看得见 diff', () => {
  /**
   * **同参数重录时，diff 的「之前」要排掉盘上那份同哈希的样本。**
   *
   * 样本文件名就是参数哈希（`corpus/<平台>/<端点>/<哈希>.json`），所以同一组参数录第二次
   * 是**覆盖**那一份。而 `stored` 里含着被覆盖的那份旧样本 —— 于是「之前」与「之后」
   * 都包含这组参数的形状，diff 恒为空：界面上显示「类型没有变化」，
   * 而平台明明改了字段。人只能靠换一组参数再打一发才看得见差异，那是白绕一圈。
   */
  it('平台改了字段时，重发同一组参数照样报出 diff', () => {
    const params = { photoId: '3xsame' }
    const before = stored({ result: 1, photo: { photoId: '3xsame', caption: '标题' } }, { params })
    // 同一组参数、平台多了一个字段：这一发覆盖的正是 `before` 那一份
    const { outcome } = buildOutcome({
      ...base,
      params,
      raw: { result: 1, photo: { photoId: '3xsame', caption: '标题', brandNew: 42 } },
      stored: [before]
    })
    expect(outcome.diff!.some((line) => line.path === 'photo.brandNew')).toBe(true)
    expect(outcome.shapeChanged).toBe(true)
  })

  it('**「之前」那一半排掉被这一发覆盖的那份** —— 否则少字段永远报不出来', () => {
    const params = { photoId: '3xsame' }
    // 盘上那份有 `caption`，这一发没有 —— 平台删了字段。
    // 不排掉旧那份的话，「之后」里它仍然贡献着 `caption`（只是变可选），
    // 于是「这个字段没了」这件事在 diff 上看不见 —— 而那是最该被看见的一类变化
    const before = stored({ result: 1, photo: { photoId: '3xsame', caption: '标题' } }, { params })
    const { outcome } = buildOutcome({ ...base, params, raw: { result: 1, photo: { photoId: '3xsame' } }, stored: [before] })
    expect(outcome.diff!.some((line) => line.path === 'photo.caption' && line.kind === 'removed')).toBe(true)
  })

  it('同参数、形状一模一样时仍然是空 diff —— 那才是「这份可以丢掉」', () => {
    const params = { photoId: '3xsame' }
    const before = stored({ result: 1, photo: { photoId: '3xsame' } }, { params })
    const { outcome } = buildOutcome({ ...base, params, raw: { result: 1, photo: { photoId: '3xsame' } }, stored: [before] })
    expect(outcome.diff).toEqual([])
    expect(outcome.shapeChanged).toBe(false)
  })
})

describe('diff 与生成读同一份 sidecar', () => {
  /**
   * **判别式 sidecar 必须穿到 diff 这一层。**
   *
   * 实测踩到的那个（抖音 `parseWork`）：`corpus/douyin/parseWork.doc.json` 里
   * `discriminantPath: false` 已经把自动发现关掉了，而 `filesFor` 刻意不传 sidecar ——
   * 于是「生成类型」产出的是单类型，而界面上 diff 预览显示的是一棵判别联合目录树
   * （`ParseWork/1080/`、`ParseWork/720/`…）。两条路对同一份样本给出两个答案，
   * 而人是照着 diff 决定要不要留这一发的。
   *
   * JSDoc 那一半仍然不传（diff 两边都不带注释，diff 自身自洽）—— 这里穿的只有
   * 「判别式怎么选」那部分，因为它决定的是**文件布局**，不是注释。
   */
  it('sidecar 关掉自动发现时，diff 里也不该出现判别联合那棵树', () => {
    // 两个变体各两份、键集合真的不同 —— 不关自动发现的话这批样本会产判别联合
    const raw = (type: string, extra: JsonValue): JsonValue => ({ result: 1, photo: { type, ...(extra as object) } })
    const four = [
      stored(raw('AV', { archive: { id: 1 } }), { params: { photoId: '3xa' } }),
      stored(raw('AV', { archive: { id: 2 } }), { params: { photoId: '3xb' } }),
      stored(raw('DRAW', { pics: ['p'] }), { params: { photoId: '3xc' } })
    ]
    const extra = stored(raw('DRAW', { pics: ['q'] }), { params: { photoId: '3xd' } })

    // 先确认前提：不给 sidecar 时它真的会产判别联合（否则下面那句测不到任何东西）
    const auto = buildOutcome({ ...base, raw: raw('DRAW', { pics: ['q'] }), params: { photoId: '3xd' }, stored: four })
    expect(auto.outcome.diff!.some((line) => line.file.includes('/AV/'))).toBe(true)

    const pinned = buildOutcome({
      ...base,
      raw: raw('DRAW', { pics: ['q'] }),
      params: { photoId: '3xd' },
      stored: four,
      sidecar: { paths: {}, discriminantPath: false }
    })
    // 钉死之后那棵判别联合的树一个文件都不出现 —— 这就是「两条路同一个布局」
    expect(pinned.outcome.diff!.some((line) => line.file.includes('/AV/'))).toBe(false)
    expect(pinned.outcome.diff!.some((line) => line.file.includes('/DRAW/'))).toBe(false)
    expect(pinned.outcome.diff!.some((line) => line.file.endsWith('guards.ts'))).toBe(false)
    // 这一发与已入库的 DRAW 同形，所以它对单类型没有贡献 —— `diff` 空是对的，
    // 而「空」本身就是那句「这份没带来新形状，建议丢掉」的依据
    expect(pinned.outcome.shapeChanged).toBe(false)
    void extra
  })
})

describe('结构化 diff 契约', () => {
  it('每条差异带 kind / path / 前后两侧，不再只有一句拼好的话', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold', caption: '标题' } })
    const { outcome } = buildOutcome({
      ...base,
      raw: { result: 1, photo: { photoId: '3xabc' }, brandNewField: 42 },
      stored: [already]
    })
    const added = outcome.diff!.find((line) => line.path === 'brandNewField')
    expect(added).toMatchObject({ kind: 'added', path: 'brandNewField', after: 'number', shape: true })
    // `photo.caption` 在旧样本里有、新样本里没有 —— 合并之后它变成可选，
    // 那是 `optionality` 而不是 `removed`（字段还在类型里，只是不再必需）
    const relaxed = outcome.diff!.find((line) => line.path === 'photo.caption')
    expect(relaxed).toMatchObject({ kind: 'optionality', path: 'photo.caption', before: '必需', after: '可选', shape: true })
  })

  it('可选性变化单独成一类，两侧说的是「必需 / 可选」', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' }, extra: 1 })
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' }, extra: 1 }, stored: [already] })
    const changed = outcome.diff!.filter((line) => line.kind === 'optionality')
    for (const line of changed) {
      expect(line.before === '必需' || line.before === '可选').toBe(true)
      expect(line.after === '必需' || line.after === '可选').toBe(true)
    }
  })

  it('每个变了的文件都带完整的前后源码 —— 左右代码对比读的就是它', () => {
    const already = stored({ result: 1, photo: { photoId: '3xold' } })
    const { outcome } = buildOutcome({
      ...base,
      raw: { result: 1, photo: { photoId: '3xabc' }, brandNewField: 42 },
      stored: [already]
    })
    const file = outcome.diffFiles!.find((entry) => entry.file.endsWith('VideoWork_V0.ts'))!
    expect(file.before).toContain('export type VideoWork_V0 = {')
    expect(file.after).toContain('brandNewField')
    // 这份样本是新增字段，所以「之前」那一侧不含它 —— 两侧不是同一份文本
    expect(file.before).not.toContain('brandNewField')
    expect(file.changes).toBeGreaterThan(0)
  })

  it('第一份样本：之前那一侧是空串（那个文件还不存在）', () => {
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } } })
    const file = outcome.diffFiles!.find((entry) => entry.file.endsWith('VideoWork_V0.ts'))!
    expect(file.before).toBe('')
    expect(file.after).toContain('export type VideoWork_V0 = {')
  })

  it('注释行那类回落差异标成非形状变化 —— 溯源块不该让人以为形状变了', () => {
    const list: JsonValue = [1, 2, 3]
    const already = stored({ result: 1 }, { normalized: list })
    const { outcome } = buildOutcome({ ...base, raw: { result: 1 }, normalized: list, stored: [already] })
    expect(outcome.diff!.length).toBeGreaterThan(0)
    expect(outcome.diff!.every((line) => line.shape === false)).toBe(true)
    expect(outcome.shapeChanged).toBe(false)
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

describe('原始响应与裁剪记录（第三处无声截断的披露）', () => {
  it('rawPayload 是**裁剪之前**的那一份 —— payload 只剩 3 条时它一条不少', () => {
    const list = Array.from({ length: 10 }, (_, index) => ({ id: index }))
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' }, list } })
    expect((outcome.payload as { list: unknown[] }).list).toHaveLength(3)
    expect((outcome.rawPayload as { list: unknown[] }).list).toHaveLength(10)
    expect(outcome.payloadTrimmed).toEqual([{ path: 'list', from: 10, to: 3 }])
  })

  it('rawPayload 是**脱敏之前**的那一份 —— 它是给人看的真实响应，要落盘的样本才脱敏', () => {
    // 判据的方向要拿准：payload 不含原值是老行为，rawPayload 含原值才是这一轮新立的规矩
    //（为什么允许：看这个控制台的人就是提供 cookie 的那个人，契约那个字段上写着整条理由）
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc', nickname: '真昵称' } } })
    expect(JSON.stringify(outcome.payload)).not.toContain('真昵称')
    expect(JSON.stringify(outcome.rawPayload)).toContain('真昵称')
  })

  it('payload 走 normalized 那层时，裁剪记录跟着走 —— Chip 说的话必须对展示物为真', () => {
    // raw 那层的 `data` 一样被截了，但展示的是 normalized，报 `data` 会指着屏幕上没有的东西说
    const items = Array.from({ length: 7 }, (_, index) => index)
    const { outcome } = buildOutcome({
      ...base,
      raw: { result: 1, photo: { photoId: '3xabc' }, data: items },
      normalized: { items }
    })
    expect(outcome.payload).toHaveProperty('items')
    expect(outcome.payloadTrimmed).toEqual([{ path: 'items', from: 7, to: 3 }])
  })

  it('一个数组都没截时 payloadTrimmed 是空数组 —— Chip 那一档不出现', () => {
    const { outcome } = buildOutcome({ ...base, raw: { result: 1, photo: { photoId: '3xabc' } } })
    expect(outcome.payloadTrimmed).toEqual([])
  })

  it('被入库判定拒掉的响应没有 rawPayload —— 那条路上连 payload 都没有（样本压根没生成）', () => {
    const { outcome } = buildOutcome({ ...base, raw: { result: 2 } })
    expect(outcome.rawPayload).toBeUndefined()
    expect(outcome.payload).toBeUndefined()
    expect(outcome.payloadTrimmed).toBeUndefined()
  })
})

describe('收据上的两个体积（receiptBytesOf）', () => {
  it('bytes 数真实响应、sampleBytes 数展示样本 —— 两份说的是不同的东西', () => {
    const raw = { result: 1, list: Array.from({ length: 100 }, (_, index) => ({ id: index })) }
    const { outcome } = buildOutcome({ ...base, raw })
    const sizes = receiptBytesOf(raw, outcome.payload)
    expect(sizes.bytes).toBe(Buffer.byteLength(JSON.stringify(raw)))
    expect(sizes.sampleBytes).toBe(Buffer.byteLength(JSON.stringify(outcome.payload)))
    // 截断真的发生了 ⇒ 两个体积真的差得开。收据上「9.7 KB（样本 4 KB）」那句话的依据就是这一对
    expect(sizes.bytes).toBeGreaterThan(sizes.sampleBytes!)
  })

  it('payload 没有时只有 bytes —— 被判定拒掉的那发，真实体积照样报', () => {
    const raw = { result: 2, risk: true }
    expect(receiptBytesOf(raw, undefined)).toEqual({ bytes: Buffer.byteLength(JSON.stringify(raw)) })
  })

  it('一发都没打出去时 bytes 是 0、没有 sampleBytes —— 0 仍然只表示「没打出去」', () => {
    expect(receiptBytesOf(undefined, undefined)).toEqual({ bytes: 0 })
  })
})

describe('lineDiff（判据是字段级的，不是行集合差）', () => {
  it('`string` → `string | null` 报成 `type`，而且**两侧的值都在那句话里**', () => {
    expect(lineDiff(typeSource(['  desc: string']), typeSource(['  desc: string | null']))).toEqual([
      {
        sign: '+',
        text: '`data.desc` 的类型从 `string` 变成 `string | null`',
        kind: 'type',
        path: 'data.desc',
        before: 'string',
        after: 'string | null',
        shape: true
      }
    ])
  })

  it('键消失报 `-`、键新增报 `+`（`only-handwritten` / `only-generated`）', () => {
    const before = typeSource(['  desc: string', '  gone: number'])
    const after = typeSource(['  desc: string', '  fresh: boolean'])
    // 按路径排序，所以 `fresh` 在 `gone` 前面
    expect(lineDiff(before, after)).toEqual([
      { sign: '+', text: '`data.fresh` 新增，类型 `boolean`', kind: 'added', path: 'data.fresh', after: 'boolean', shape: true },
      { sign: '-', text: '`data.gone` 不再出现（原本 `number`）', kind: 'removed', path: 'data.gone', before: 'number', shape: true }
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
      {
        sign: '-',
        text: '`data.extra.id` 不再出现（原本 `number`）',
        kind: 'removed',
        path: 'data.extra.id',
        before: 'number',
        shape: true
      },
      { sign: '+', text: '`data.extra.name` 新增，类型 `string`', kind: 'added', path: 'data.extra.name', after: 'string', shape: true }
    ])
  })

  it('可选性变化报成 `optionality` —— 类型一个字没变也要报', () => {
    expect(lineDiff(typeSource(['  desc: string']), typeSource(['  desc?: string']))).toEqual([
      { sign: '+', text: '`data.desc` 从必需变成可选', kind: 'optionality', path: 'data.desc', before: '必需', after: '可选', shape: true }
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
    expect(lineDiff('', barrel)).toEqual([
      { sign: '+', text: "export type { VideoWork_V0 } from './VideoWork_V0'", kind: 'line', path: '', shape: true }
    ])
  })

  it('回落的那条路仍然是行集合差：增删各归各的，空行不算', () => {
    expect(lineDiff('a\n\nb', 'a\nc')).toEqual([
      { sign: '+', text: 'c', kind: 'line', path: '', shape: true },
      { sign: '-', text: 'b', kind: 'line', path: '', shape: true }
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
    // 注释行走回落那条路：`shape: false` 正是 `shapeChanged` 把溯源块滤掉的判据
    expect(line).toEqual({ sign: '+', text: '  /** 时长 - 秒 */', kind: 'line', path: '', shape: false })
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
