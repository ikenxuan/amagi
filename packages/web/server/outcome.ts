/**
 * 「一次录制的结果长什么样」—— 这一层是**纯的**，不发请求、不读盘、不看时钟。
 *
 * 拆出来的理由：这套逻辑原先住在 `packages/core/scripts/curate-corpus.mts`（已删）里那个
 * `recordOne` 函数，一共六件事，只有一件（`execute` 那一发）非纯，而其余五件（入库判定、
 * 脱敏清单摊平、类型 diff、破坏性变更过滤、`pendingId` 的门控）全是真逻辑、全都值得测 ——
 * 而它们在脚本里一条测试都没有（`vitest.config.ts` 的 include 覆盖不到 `scripts/`）。
 *
 * 于是 `server/record.ts` 只留「发请求 + 拿原始响应」，判断都在这里。
 * 时钟、随机数、已入库样本一律从参数进来，测试不用 mock 任何全局。
 */

import {
  type CorpusSample,
  createCorpusSample,
  detectBreakingChanges,
  type JsonValue,
  planCorpusTypes,
  type ScrubOptions,
  trimSample
} from '@ikenxuan/amagi-typegen'

import type { DiffLine, RecordOutcome } from '../shared/contract'

export type { DiffLine, RecordOutcome }

/** 待定样本：`ok` 的那些会进内存队列，等人点「入库」才写盘 */
export interface PendingSample {
  platform: string
  endpoint: string
  /** 仓库相对路径，如 `corpus/douyin/videoWork/a1b2c3d4e5f6.json` */
  path: string
  /** 已序列化好的文件内容 —— 入库那一步只是 `writeFileSync`，不再重新算一遍 */
  json: string
  /**
   * 解析好的样本本体。
   *
   * 它在这里的唯一用途是**让同一批里后面几组能看见前面几组** —— 批量录制时前面的样本只在
   * 内存里、一份都没落盘，而 `shapeChanged` 与 diff 的「之前」那一半原先只读磁盘。
   * 于是一个 0 样本的端点跑 6 组同形样本，6 份都被报成「带来了新形状」，
   * 人照着提示把 6 份全留下 —— 那正是这个工具要消灭的那件事（两份 2.57 MB 的重复
   * B站 `comments`）。留着对象而不是回头 `JSON.parse(json)`：那样等于把序列化再反过来走一遍，
   * 多一处会与 `createCorpusSample` 脱节的地方。
   */
  sample: CorpusSample
}

export interface BuildOutcomeInput {
  platform: string
  endpoint: string
  params: Record<string, JsonValue>
  /** 未经 decode / normalize 的原始响应 */
  raw: JsonValue
  /** 归一化后的值。端点没有 normalize 步骤就别传（`undefined` 与 `null` 是两件事） */
  normalized?: JsonValue
  http: { status: number; statusText?: string }
  amagiVersion: string
  /** 这个端点**已入库**的样本 —— 类型 diff 的「之前」那一半 */
  stored: readonly CorpusSample[]
  /** 由调用方传，纯函数不看时钟 */
  now: Date
  /** 由调用方传，纯函数不摇骰子 */
  newId: () => string
  /** 脱敏选项。`session` 从这里传，一批样本共用一个才能保住跨样本的一致性 */
  scrub?: ScrubOptions
}

export interface BuildOutcomeResult {
  outcome: RecordOutcome
  /** 可入库时的待定条目；`outcome.ok` 为 false 时没有 */
  pending?: PendingSample
}

/**
 * 这个产物路径归**单端点**管吗？
 *
 * `planCorpusTypes` 只喂了一个端点，所以它产的两层 barrel（根 `index.ts` 与
 * `<平台>/index.ts`）描述的是「这棵树只有这一个端点」—— 那是假的。
 * 不排掉它们会有两个后果，第二个更糟：
 *
 * 1. diff 里混进 `- export {}` / `+ export type * from './kuaishou'` 这种噪音；
 * 2. **单端点生成写这两个文件会把其它端点的条目整个抹掉** ——
 *    barrel 的完整性只有全量 `pnpm gen:types` 能保证。
 *
 * 所以这个判据同时给 diff 与「就地生成」用（后者在 `server/index.ts`）。
 */
export const isEndpointOwnedFile = (path: string): boolean => {
  const parts = path.split('/')
  // `index.ts`（根 barrel）与 `<平台>/index.ts`（平台 barrel）都归全量生成
  return parts.length > 2
}

/**
 * 一个端点的产物：加不加这份待定样本各生成一次，拿来比。
 *
 * **不传 sidecar 是有意的**：diff 两边都不带 JSDoc，diff 自身仍然自洽，
 * 而读 sidecar 要碰文件系统 —— 那会把这一层弄脏。代价是这里的 diff 与
 * `pnpm gen:types` 的真实产出不逐字相同（那边会注入注释）。
 */
const filesFor = (input: {
  platform: string
  endpoint: string
  samples: readonly CorpusSample[]
  extra?: CorpusSample
  now: Date
}): Map<string, string> => {
  const { files } = planCorpusTypes({
    endpoints: [
      {
        platform: input.platform,
        endpoint: input.endpoint,
        samples: input.extra === undefined ? [...input.samples] : [...input.samples, input.extra]
      }
    ],
    now: input.now
  })
  return new Map([...files].filter(([path]) => isEndpointOwnedFile(path)))
}

/**
 * 行级 diff，够看出多了/少了哪些字段就行 —— 不引第三方 diff 库。
 *
 * 返回结构化的行（`DiffLine` 在 `shared/contract.ts`）而不是拼好的字符串：
 * 前端要按增删上色，而按 `line.includes(' + ')` 猜会把正文里含 ` - ` 的行误判成删除行。
 */
export const lineDiff = (before: string, after: string): { sign: '+' | '-'; text: string }[] => {
  const beforeLines = new Set(before.split('\n'))
  const afterLines = new Set(after.split('\n'))
  const out: { sign: '+' | '-'; text: string }[] = []
  for (const line of after.split('\n')) if (!beforeLines.has(line) && line.trim() !== '') out.push({ sign: '+', text: line })
  for (const line of before.split('\n')) if (!afterLines.has(line) && line.trim() !== '') out.push({ sign: '-', text: line })
  return out
}

/**
 * 这一行 diff 是**形状**变化，还是只是注释变了。
 *
 * 为什么需要区分：产物文件头里有**溯源块**（几份样本、参数哈希、录制日期），
 * 所以多录一份样本必然让 diff 至少多两行注释 —— 哪怕那份样本的形状与已有的一模一样。
 * 于是「diff 非空」不能当成「这份样本有价值」的判据，那样每一份都显得有价值。
 *
 * 注释行（`//` 与 JSDoc 的 `*`）一律不算：sidecar 注入的 JSDoc 同理，
 * 它描述的是语义而不是形状。
 */
const isShapeLine = (text: string): boolean => {
  const trimmed = text.trim()
  return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')
}

/**
 * 拿到原始响应之后的**全部判断**。发请求那一步在 `record.ts`，这里一行网络代码都没有。
 *
 * 六件事，逐个都是这一层存在的理由：
 * 1. 走 `createCorpusSample`（入库判定 / 脱凭证 / 脱敏 / 算哈希 / 拼路径 / 序列化）
 * 2. 摊平脱敏清单成前端能直接显示的字符串（**只有路径与数量，不留原值**）
 * 3. 生成类型 diff（加不加这份样本各跑一遍 `planCorpusTypes`）
 * 4. 判断这份样本**有没有带来新形状**（`shapeChanged`）—— 见 `isShapeLine`
 * 5. 过滤破坏性变更，只留会让下游编译红的
 * 6. **门控 `pendingId`** —— 脱敏有残留就不给，于是「入库」这条路在前后端同时不存在
 */
export const buildOutcome = (input: BuildOutcomeInput): BuildOutcomeResult => {
  const { platform, endpoint, params, stored, now } = input

  // 截断在**入库之前**：列表端点一次返回上百条同形元素，而截断前后 `generateTypes`
  // 的产物逐字节相同（typegen 那边有断言钉着），所以这一步不影响类型、只影响体积
  const trimmedRaw = trimSample(input.raw)
  const trimmedNormalized = input.normalized === undefined ? undefined : trimSample(input.normalized)

  const created = createCorpusSample({
    platform,
    endpoint,
    params,
    raw: trimmedRaw.value,
    ...(trimmedNormalized === undefined ? {} : { normalized: trimmedNormalized.value }),
    http: input.http,
    amagiVersion: input.amagiVersion,
    recordedAt: now,
    ...(input.scrub === undefined ? {} : { scrub: input.scrub })
  })
  // 被拒的响应在**类型上**就拿不到 sample —— 「跳过」是唯一出路，不靠调用方记得判 if
  if (!('sample' in created)) return { outcome: { ok: false, verdict: created.verdict } }

  const manifest = created.sample.metadata.scrub
  const before = filesFor({ platform, endpoint, samples: stored, now })
  const after = filesFor({ platform, endpoint, samples: stored, extra: created.sample, now })

  const diff: DiffLine[] = []
  for (const [file, source] of after) {
    for (const line of lineDiff(before.get(file) ?? '', source)) diff.push({ file, ...line })
  }
  // 整个文件不再产出：只比对「生成的每个文件对不对」永远发现不了这一类
  for (const file of before.keys()) if (!after.has(file)) diff.push({ file, sign: '-', text: '（整个文件不再产出）' })

  const ok = manifest.leaks.length === 0
  const outcome: RecordOutcome = {
    ok,
    verdict: created.verdict,
    ...(ok ? { pendingId: input.newId() } : {}),
    scrub: {
      replacements: manifest.replacements.length,
      suspects: manifest.suspects.map((item) => `${item.path} —— ${item.reason}`),
      leaks: manifest.leaks.map((item) => `${item.path} —— ${item.reason}`)
    },
    // 类型描述的是归一化后那一层，所以面板上显示的也是它（PRD 待决 #2）
    payload: 'normalized' in created.sample ? (created.sample.normalized as JsonValue) : created.sample.raw,
    diff,
    // **这份样本带来新形状了吗。** 只数形状行，不数注释行 —— 见 `isShapeLine`。
    // 这是「留下还是丢掉」最直接的一条依据：没带来新形状的样本对类型的贡献是零，
    // 而那两份 2.57 MB 的重复 B站 `comments` 样本正是没有这个提示的产物
    shapeChanged: diff.some((line) => isShapeLine(line.text)),
    breaking: detectBreakingChanges(before, after)
      .filter((change) => change.breaksReaders)
      .map((change) => change.message)
  }

  return ok ? { outcome, pending: { platform, endpoint, path: created.path, json: created.json, sample: created.sample } } : { outcome }
}
