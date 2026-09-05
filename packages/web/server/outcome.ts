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
  diffFlattened,
  type FieldDiff,
  flattenTypeSource,
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

/** {@link DiffLine} 少掉 `file` 那一半 —— 文件名由调用处补上（它本来就在按文件循环） */
type DiffText = Omit<DiffLine, 'file'>

/**
 * 行集合差：两个 `Set` 相减，一边有一边没有就报出来。
 *
 * **这曾经是主路径，现在只剩「回落」一个用途** —— 换掉它的理由与回落的判据都在
 * {@link lineDiff} 上。留着而不是删掉是有意的：它是唯一一个「什么源码都能说出点什么」的判据。
 *
 * 返回结构化的行而不是拼好的字符串：前端要按增删上色，
 * 而按 `line.includes(' + ')` 猜会把正文里含 ` - ` 的行误判成删除行。
 */
const lineSetDiff = (before: string, after: string): DiffText[] => {
  const beforeLines = new Set(before.split('\n'))
  const afterLines = new Set(after.split('\n'))
  const out: DiffText[] = []
  for (const line of after.split('\n')) if (!beforeLines.has(line) && line.trim() !== '') out.push({ sign: '+', text: line })
  for (const line of before.split('\n')) if (!afterLines.has(line) && line.trim() !== '') out.push({ sign: '-', text: line })
  return out
}

/**
 * 一处字段级差异 → 一行 `DiffLine`。
 *
 * **`diffFlattened` 的两个参数名是它自己那边的语境**（「生成 vs 手写」那张清单），
 * 这里读作「之后 vs 之前」：调用处把 `after` 传在第一位，于是
 * `only-generated` = 新版多了这个字段，`only-handwritten` = 新版没有它了。
 *
 * `sign` 只回答一个问题：**新版那一侧还有没有这个字段。**
 * `only-generated` → `+`；`only-handwritten` → `-`；`type` / `optionality` → `+`
 * （字段两边都在，变的是它的类型 / 可选性）。
 *
 * 后两类没有拆成「`-` 旧值 + `+` 新值」一对，理由就是要换掉行集合差的那个理由：
 * 拆成一对就把「`data.desc` 的类型从 `string` 变成 `string | null`」这**一句话**切成两半，
 * 人得自己把两行对起来才知道那是「改了」而不是「删一个又加一个」。
 * 一行一句话**不丢信息**（两侧的值都写在 `text` 里），丢的只是机读性 —— 那由下一轮的契约补。
 */
const renderFieldDiff = (diff: FieldDiff): DiffText => {
  // 路径一律裹反引号（同 `breaking.ts` 的文案风格），顺带保证这行永远不像注释 ——
  // `isShapeLine` 按行首认注释，而 JSON 的键名什么字符都可能有
  const path = `\`${diff.path}\``
  switch (diff.kind) {
    case 'only-generated':
      return { sign: '+', text: `${path} 新增，类型 \`${diff.generated!}\`` }
    case 'only-handwritten':
      return { sign: '-', text: `${path} 不再出现（原本 \`${diff.handwritten!}\`）` }
    case 'type':
      return { sign: '+', text: `${path} 的类型从 \`${diff.handwritten!}\` 变成 \`${diff.generated!}\`` }
    case 'optionality':
      return { sign: '+', text: `${path} 从${diff.handwritten!}变成${diff.generated!}` }
  }
}

/**
 * 一个产物文件的类型 diff。**判据是字段级的**（PRD ④），不是行集合差。
 *
 * 换掉的那个实现是「两个 `Set` 相减」，它能看出「这一行变了」，但给不出
 * **哪个字段怎么变了** —— 而后者才是这块面板要回答的问题。它还有一个更隐蔽的坏处：
 * 比的是**行的集合**，所以「一个类型丢了 `  id: number`，而同一份文件里另一个类型也有这一行」
 * 在集合上看不出来，报出来是「没有差异」—— 那正是 `shapeChanged` 会说谎的方向
 * （它会让人把一份真带来了新形状的样本丢掉）。反过来子类型改名（`Data` → `Data2`）
 * 会报出几行纯噪音：声明行与引用行各一对，而形状一个字节都没变。
 *
 * 现在走 `flattenTypeSource` + `diffFlattened`（`packages/typegen/src/flatten.ts`）：
 * 路径级、名字无关（`FlatField.shape` 把子类型引用归一成 `↦`），产出四类判据。
 * 那两个函数原先只服务「生成 vs 手写」那张清单，把两边换成「加这份样本之前 / 之后」直接就能用。
 *
 * **这一轮只换判据、不换传输形状，是有意分两步的。** 返回的仍然是 `DiffLine` 那个既有形状
 * （`sign` + 一句话），因为 `shared/contract.ts` 这一轮不动。收益立刻到手：`text` 从
 * 「这一行变了」变成「`data.desc` 的类型从 `string` 变成 `string | null`」。代价是 `sign`
 * 只有两个取值，表达不了「改了」这第三种状态（见 {@link renderFieldDiff}）。
 *
 * 下一轮把 `DiffLine` 换成结构化的字段级 diff（直接带 `kind` / `path` / 两侧的值）时要动的是：
 * 契约里的 `DiffLine`、这里的 {@link renderFieldDiff}（改成直接回 `FieldDiff` + `file`）、
 * `buildOutcome` 里那个拼 `file` 的循环与「整个文件不再产出」那条、前端按 `sign` 上色的地方，
 * 以及 {@link isShapeLine}（那时「形状行」应该按 `kind` 判，不再按行首猜）。
 * 顺带把 `lineDiff` 这个已经名不副实的名字一起换掉 —— 这一轮不改名，是因为它的返回类型下一轮
 * 本来就要变（`DiffText` → 结构化的字段级 diff），一次改完比改两遍省事；而且 `server/` 底下
 * 这一轮有别的改动在并行，少动一个跨文件的名字少一次冲突。
 */
export const lineDiff = (before: string, after: string): DiffText[] => {
  const afterFlat = flattenTypeSource(after)
  const beforeFlat = flattenTypeSource(before)
  // 两边都摊不出一个字段 ⇒ 这个文件不是类型声明，字段级判据这一次什么都说不出来。
  //
  // 这不是假设，`filesFor` 喂进来的就有三种：`<Endpoint>/index.ts`（一行 re-export）、
  // `<Endpoint>/<取值>/index.ts`（`export type X = A | B`）、`<Endpoint>/guards.ts`
  // （判别式字面量联合 + 几个 `is*` 函数）。`flattenTypeSource` 只认「每个属性一行、
  // 两格缩进、类型表达式在冒号后面」，在这三种上一律摊出空结果。
  //
  // **回落到行差，而不是跳过。** 两种错法的代价差得远：跳过的话「这个文件变了」会静默消失，
  // 而 `shapeChanged` 正是从 diff 算出来的 —— 于是界面会对着一份真带来了新形状的样本说
  // 「可以丢掉」，人照着丢了就找不回来。回落的代价只是几行噪音（新产 barrel 那一行、
  // `guards.ts` 头上的溯源注释），噪音是看得见的，而注释行本来就不算形状行（{@link isShapeLine}）。
  //
  // 判据写成「两边都摊不出字段」而不是「文件名是不是 index.ts / guards.ts」也是这个理由：
  // 它兜的是「字段级判据这次没话说」这件事本身 —— 根类型只有索引签名、根本身是数组或标量
  // 的端点同样落在这里，产物将来多一种格式也不用回来改。
  if (afterFlat.fields.size === 0 && beforeFlat.fields.size === 0) return lineSetDiff(before, after)
  // 方向：`after` 在前，见 {@link renderFieldDiff}
  return diffFlattened(afterFlat, beforeFlat).diffs.map(renderFieldDiff)
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
 *
 * **换成字段级判据之后它只在回落那条路上还起作用**（{@link lineDiff}）——
 * 类型声明文件的注释现在压根不产 diff 行了，但 `guards.ts` 与各层 barrel 也带着同一个溯源块，
 * 而它们走的是行差。所以这个函数还不能删，删了那类端点每录一份同形样本都会被报成「带来了新形状」。
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
 * 3. 生成类型 diff（加不加这份样本各跑一遍 `planCorpusTypes`，逐文件过 `lineDiff`）
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
    // 而那两份 2.57 MB 的重复 B站 `comments` 样本正是没有这个提示的产物。
    //
    // 换成字段级判据后这一行一个字都没改，语义也没变，只是「形状行」的来源变了两处：
    // 类型声明文件上，每一条字段级差异**都是**形状行（它们裹着反引号，永远不像注释），
    // 而溯源块那两行注释现在压根不产 diff 行 —— 于是同形样本的 diff 直接是空的；
    // 非类型声明的产物（barrel / `guards.ts`）走回落的行差，那里仍然靠 `isShapeLine` 把
    // 同一个溯源块滤掉。加上「整个文件不再产出」那条也算形状行，三种来源合起来与从前一致
    shapeChanged: diff.some((line) => isShapeLine(line.text)),
    breaking: detectBreakingChanges(before, after)
      .filter((change) => change.breaksReaders)
      .map((change) => change.message)
  }

  return ok ? { outcome, pending: { platform, endpoint, path: created.path, json: created.json, sample: created.sample } } : { outcome }
}
