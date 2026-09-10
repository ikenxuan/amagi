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
  type DocSidecar,
  createCorpusSample,
  detectBreakingChanges,
  diffFlattened,
  type FieldDiff,
  flattenTypeSource,
  type JsonValue,
  planCorpusTypes,
  responseDirectionOf,
  type ScrubOptions,
  serializeCorpusSample,
  shapeIndexOf,
  trimSample
} from '@ikenxuan/amagi-typegen'

import type { DiffFile, DiffLine, RecordOutcome, ResponseDirection } from '../shared/contract'

export type { DiffFile, DiffLine, RecordOutcome }

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
  /**
   * 这份待定样本当前对应的 `RecordOutcome`。
   *
   * 响应方向改变时，rawPayload / 收据 / 裁剪记录都不该变 —— 它们描述的是同一发响应；
   * 变的只有样本 metadata、类型 diff 与 `Error_V0` / `_V0` 的分流。把 outcome 挂在
   * 待定条目上，重判那一步就能以它为底本，而不是让前端把展示数据再传回来。
   */
  outcome: RecordOutcome
  /** 这个端点的 sidecar，重判方向时要用同一份 —— 否则重判会换掉文件布局 */
  sidecar?: DocSidecar
}

export interface BuildOutcomeInput {
  platform: string
  endpoint: string
  params: Record<string, JsonValue>
  /**
   * 未经 normalize 的响应。**`decode` 之后那一层** —— 三个端点的 wire body 不是 JSON，
   * 判据与四个后果都在 `server/index.ts` 传这个字段的地方，语义在 `CorpusSample.raw` 上
   */
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
  /** 开发者声明的响应方向；缺省 success。只影响类型分流，不影响入库判定 */
  direction?: ResponseDirection
  /** 开发者选的形状序号（`_V<n>`）。缺省 0 = 合并进现有类型 */
  shapeIndex?: number
  /**
   * 这个端点的注释 sidecar（`corpus/<平台>/<端点>.doc.json`）。
   *
   * **要传**：它带着 `discriminantPath`，而那个字段决定 diff 里的文件布局 ——
   * 不传的话界面上的 diff 与「生成类型」写出来的产物会是两套布局（见 {@link filesFor}）。
   * 读盘那一步在 `server/index.ts`，这一层仍然是纯的。
   */
  sidecar?: DocSidecar
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
 * **sidecar 由调用方注入**（这一层仍然不碰文件系统）。原先这里一律不传，理由是
 * 「diff 两边都不带 JSDoc，diff 自身仍然自洽」—— 那句话对注释成立，对**判别式**不成立：
 * `discriminantPath` 决定的是**文件布局**。实测踩到的那次（抖音 `parseWork`）是
 * `corpus/douyin/parseWork.doc.json` 已经把自动发现关掉了，而 diff 这条路没读它，
 * 于是界面上显示的是一棵判别联合目录树（`ParseWork/1080/`、`ParseWork/720/`…），
 * 而「生成类型」写出来的是单类型 —— 两条路对同一份样本给出两个答案，
 * 而人是照着 diff 决定要不要留这一发的。
 */
const filesFor = (input: {
  platform: string
  endpoint: string
  samples: readonly CorpusSample[]
  extra?: CorpusSample
  now: Date
  sidecar?: DocSidecar
}): Map<string, string> => {
  const { files } = planCorpusTypes({
    endpoints: [
      {
        platform: input.platform,
        endpoint: input.endpoint,
        samples: input.extra === undefined ? [...input.samples] : [...input.samples, input.extra],
        ...(input.sidecar === undefined ? {} : { sidecar: input.sidecar })
      }
    ],
    now: input.now
  })
  return new Map([...files].filter(([path]) => isEndpointOwnedFile(path)))
}

/** {@link DiffLine} 少掉 `file` 那一半 —— 文件名由调用处补上（它本来就在按文件循环） */
type DiffText = Omit<DiffLine, 'file'>

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
  // 回落这条路给不出字段路径，`kind` 一律是 `line`；`shape` 由 `isShapeLine` 判
  // （注释行不算形状变化 —— 溯源块每录一份同形样本都会变）
  for (const line of after.split('\n')) {
    if (!beforeLines.has(line) && line.trim() !== '') out.push({ sign: '+', text: line, kind: 'line', path: '', shape: isShapeLine(line) })
  }
  for (const line of before.split('\n')) {
    if (!afterLines.has(line) && line.trim() !== '') out.push({ sign: '-', text: line, kind: 'line', path: '', shape: isShapeLine(line) })
  }
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
  // 字段级差异**全部**算形状变化：它们描述的就是形状本身，不存在「只是注释变了」那一档
  switch (diff.kind) {
    case 'only-generated':
      return {
        sign: '+',
        text: `${path} 新增，类型 \`${diff.generated!}\``,
        kind: 'added',
        path: diff.path,
        after: diff.generated!,
        shape: true
      }
    case 'only-handwritten':
      return {
        sign: '-',
        text: `${path} 不再出现（原本 \`${diff.handwritten!}\`）`,
        kind: 'removed',
        path: diff.path,
        before: diff.handwritten!,
        shape: true
      }
    case 'type':
      return {
        sign: '+',
        text: `${path} 的类型从 \`${diff.handwritten!}\` 变成 \`${diff.generated!}\``,
        kind: 'type',
        path: diff.path,
        before: diff.handwritten!,
        after: diff.generated!,
        shape: true
      }
    case 'optionality':
      return {
        sign: '+',
        text: `${path} 从${diff.handwritten!}变成${diff.generated!}`,
        kind: 'optionality',
        path: diff.path,
        before: diff.handwritten!,
        after: diff.generated!,
        shape: true
      }
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
 * 选「单独建新形状」会落到哪个 `_V<n>`。见 `RecordOutcome.nextShapeIndex`。
 *
 * 三条判据各有各的事故来源：
 *
 * - **只看同方向的样本。** `plan.ts` 里 `successByIndex` / `errorByIndex` 是两个 Map，
 *   序号在两侧是两套命名空间 —— 混着算会让错误那侧白跳一格。
 * - **`coexisting` 是「会与这一发共存的那些」，不是「盘上那些」。** 调用处传的是 `rest`
 *   （已排掉同参数哈希那份），所以重选一次序号不会一路递增：自己那份不算已占用。
 * - **空出来的序号先填**（从 1 起找第一个空的，不是 `max + 1`）：`_V1` 的样本被删掉之后
 *   下一个新形状该补回那个洞，否则联合是 `_V0 | _V2`，而界面上那句「单独建新形状（_V2）」
 *   解释不了 1 去哪了。
 *
 * 从 1 起而不是 0：0 是「合并进现有类型」那一档本身，`separate` 的语义就是「≥ 1」。
 */
const nextShapeIndexOf = (coexisting: readonly CorpusSample[], direction: ResponseDirection): number => {
  const taken = new Set(coexisting.filter((sample) => responseDirectionOf(sample) === direction).map(shapeIndexOf))
  let next = 1
  while (taken.has(next)) next += 1
  return next
}

/**
 * 两版产物 → 「字段变更列表」与「左右代码对比」两份数据，**一次算完**。
 *
 * 抽出来的理由是同源：界面上那两个视图必须描述同一次变化。让前端从 `diff` 反推源码、
 * 或者让它自己再跑一遍生成器，都会造出第二套口径 —— 而「两处说法不一致」正是这套工具
 * 反复在消灭的东西。所以 server 一次把两样都算好：`lines` 逐条带 `kind` / `path` / 两侧，
 * `files` 带每个变了的文件的完整前后源码。
 */
const diffOf = (before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): { lines: DiffLine[]; files: DiffFile[] } => {
  const lines: DiffLine[] = []
  const files: DiffFile[] = []
  const push = (file: string, produced: readonly DiffText[], sources: { before: string; after: string }): void => {
    if (produced.length === 0) return
    for (const line of produced) lines.push({ file, ...line })
    files.push({ file, before: sources.before, after: sources.after, changes: produced.length })
  }
  for (const [file, source] of after) {
    const previous = before.get(file) ?? ''
    push(file, lineDiff(previous, source), { before: previous, after: source })
  }
  // 整个文件不再产出：只比对「生成的每个文件对不对」永远发现不了这一类
  for (const [file, source] of before) {
    if (after.has(file)) continue
    push(file, [{ sign: '-', text: '（整个文件不再产出）', kind: 'line', path: '', shape: true }], { before: source, after: '' })
  }
  return { lines, files }
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
 * 6. **判定通过就给 `pendingId`** —— 入库这条路由「保存」按钮显式触发，
 *    不再有脱敏残留那道隐藏闸（这个工具的参数全是公开 ID，隐私模型已重新判定）
 */
export const buildOutcome = (input: BuildOutcomeInput): BuildOutcomeResult => {
  const { platform, endpoint, params, stored, now } = input

  // 截断在**入库之前**：列表端点一次返回上百条同形元素，而截断前后 `generateTypes`
  // 的产物逐字节相同（typegen 那边有断言钉着），所以这一步不影响类型、只影响体积。
  // 截下来的记录（`{path, from, to}`）跟着 payload 回给前端 ——「已截断」Chip 靠它说话；
  // 在此之前它被直接丢弃，于是「emoji_list 只有 3 条」在界面上无人解释（PRD 阶段 3 的第三处）
  const trimmedRaw = trimSample(input.raw)
  const trimmedNormalized = input.normalized === undefined ? undefined : trimSample(input.normalized)
  // payload 走哪一层（normalized 优先），裁剪记录就跟着哪一份 —— Chip 对展示物为真
  const shownTrim = trimmedNormalized ?? trimmedRaw

  const created = createCorpusSample({
    platform,
    endpoint,
    params,
    raw: trimmedRaw.value,
    ...(trimmedNormalized === undefined ? {} : { normalized: trimmedNormalized.value }),
    http: input.http,
    amagiVersion: input.amagiVersion,
    recordedAt: now,
    ...(input.scrub === undefined ? {} : { scrub: input.scrub }),
    ...(input.direction === undefined ? {} : { direction: input.direction }),
    ...(input.shapeIndex === undefined ? {} : { shapeIndex: input.shapeIndex })
  })
  // 被拒的响应在**类型上**就拿不到 sample —— 「跳过」是唯一出路，不靠调用方记得判 if
  if (!('sample' in created)) return { outcome: { ok: false, verdict: created.verdict } }

  const manifest = created.sample.metadata.scrub
  const sidecarFor = input.sidecar === undefined ? {} : { sidecar: input.sidecar }
  /**
   * 「之前」与「之后」都要排掉**被这一发覆盖的那份**。
   *
   * 样本文件名就是参数哈希（`corpus.ts` 的 `corpusPath`），所以同一组参数录第二次是
   * **覆盖**，不是新增。而 `stored` 是从磁盘读来的、含着那份旧的 —— 留着它有两个后果：
   *
   * 1. 「之后」里旧那份仍在贡献形状，于是**平台删掉字段这件事永远报不出来**
   *    （那个字段只会从必需变可选），而那是最该被看见的一类变化；
   * 2. 「之前」里有它、「之后」里也有它，同参数重录的 diff 恒为空 ——
   *    界面说「类型没有变化」，人只能换一组参数再打一发才看得见差异。
   *
   * 排掉之后两侧的语义才对得上盘上真实会发生的事：写盘那一步就是覆盖同名文件。
   */
  const rest = stored.filter((sample) => sample.metadata.paramsHash !== created.sample.metadata.paramsHash)
  const before = filesFor({ platform, endpoint, samples: stored, now, ...sidecarFor })
  const after = filesFor({ platform, endpoint, samples: rest, extra: created.sample, now, ...sidecarFor })

  const { lines: diff, files: diffFiles } = diffOf(before, after)

  const outcome: RecordOutcome = {
    ok: true,
    verdict: created.verdict,
    direction: created.sample.metadata.direction,
    shapeIndex: created.sample.metadata.shapeIndex,
    // 从 `rest` 而不是 `stored` 算 —— 自己那份不算已占用，见 `nextShapeIndexOf`
    nextShapeIndex: nextShapeIndexOf(rest, created.sample.metadata.direction),
    pendingId: input.newId(),
    scrub: {
      replacements: manifest.replacements.length,
      suspects: manifest.suspects.map((item) => `${item.path} —— ${item.reason}`)
    },
    // 类型描述的是归一化后那一层，所以面板上显示的也是它（PRD 待决 #2）
    payload: 'normalized' in created.sample ? (created.sample.normalized as JsonValue) : created.sample.raw,
    // **裁剪 + 脱敏之前的原始响应**，给「响应」页的「原始」档。入库样本维持「先裁剪再脱敏」
    // 不变（corpus 的体积纪律），而界面上这份真实响应用不着裁（Monaco 撑得住 280 KB 级的
    // JSON）、也用不着脱敏（看它的人就是提供 cookie 的那个人 —— 理由写在契约那个字段上）
    rawPayload: input.raw,
    payloadTrimmed: shownTrim.trimmed,
    diff,
    diffFiles,
    // **这份样本带来新形状了吗。** 只数形状行，不数注释行 —— 见 `isShapeLine`。
    // 这是「留下还是丢掉」最直接的一条依据：没带来新形状的样本对类型的贡献是零，
    // 而那两份 2.57 MB 的重复 B站 `comments` 样本正是没有这个提示的产物。
    //
    // 换成字段级判据后这一行一个字都没改，语义也没变，只是「形状行」的来源变了两处：
    // 类型声明文件上，每一条字段级差异**都是**形状行（它们裹着反引号，永远不像注释），
    // 而溯源块那两行注释现在压根不产 diff 行 —— 于是同形样本的 diff 直接是空的；
    // 非类型声明的产物（barrel / `guards.ts`）走回落的行差，那里仍然靠 `isShapeLine` 把
    // 同一个溯源块滤掉。加上「整个文件不再产出」那条也算形状行，三种来源合起来与从前一致
    shapeChanged: diff.some((line) => line.shape),
    breaking: detectBreakingChanges(before, after)
      .filter((change) => change.breaksReaders)
      .map((change) => change.message)
  }

  return {
    outcome,
    pending: { platform, endpoint, path: created.path, json: created.json, sample: created.sample, outcome, ...sidecarFor }
  }
}

export const parseResponseDirection = (value: unknown): ResponseDirection | undefined =>
  value === 'success' || value === 'error' ? value : undefined

export interface RebuildOutcomeInput {
  entry: PendingSample
  /** 换方向。不传就保持原样 —— 这条路也用来只换形状序号 */
  direction?: ResponseDirection
  /** 换形状序号（`_V<n>`）。不传就保持原样 */
  shapeIndex?: number
  stored: readonly CorpusSample[]
  now: Date
}

/**
 * 响应回来之后，把一份还在内存里的待定样本重判到另一个方向。
 *
 * 这一步**不重新发请求、不重新脱敏**：样本本体已经定下来了，变的只有
 * `metadata.direction`、序列化后的 json、以及它对 `_V0` / `_Error_V0` 的类型贡献。
 * rawPayload、HTTP 收据、裁剪记录都从原 outcome 继承 —— 它们描述的是同一发响应。
 */
export const rebuildOutcome = (input: RebuildOutcomeInput): { outcome: RecordOutcome; pending: PendingSample } => {
  const { entry, stored, now } = input
  const direction = input.direction ?? entry.sample.metadata.direction
  const shapeIndex = input.shapeIndex ?? entry.sample.metadata.shapeIndex
  const sample: CorpusSample = { ...entry.sample, metadata: { ...entry.sample.metadata, direction, shapeIndex } }
  const json = serializeCorpusSample(sample)

  const sidecarFor = entry.sidecar === undefined ? {} : { sidecar: entry.sidecar }
  // 同 `buildOutcome`：这一发覆盖的是同参数哈希那一份，「之后」里不该再有它
  const rest = stored.filter((entry_) => entry_.metadata.paramsHash !== sample.metadata.paramsHash)
  const before = filesFor({ platform: entry.platform, endpoint: entry.endpoint, samples: stored, now, ...sidecarFor })
  const after = filesFor({ platform: entry.platform, endpoint: entry.endpoint, samples: rest, extra: sample, now, ...sidecarFor })
  const { lines: diff, files: diffFiles } = diffOf(before, after)

  const outcome: RecordOutcome = {
    ...entry.outcome,
    direction,
    shapeIndex,
    // 跟着方向重算：换到错误那侧时序号是另一套命名空间（见 `nextShapeIndexOf`）
    nextShapeIndex: nextShapeIndexOf(rest, direction),
    diff,
    diffFiles,
    shapeChanged: diff.some((line) => line.shape),
    breaking: detectBreakingChanges(before, after)
      .filter((change) => change.breaksReaders)
      .map((change) => change.message)
  }
  return { outcome, pending: { ...entry, sample, json, outcome } }
}

/**
 * 收据上那两个体积。**抽成纯函数而不是留在路由里**：路由层按这个仓库的纪律不测
 * （`compute.test.ts` 文件头那句），而「两个数各对各的真是哪一份」恰恰是最容易悄悄
 * 走样的判据 —— 上一次走样就是把「真实响应的体积」量成了「脱敏后样本的体积」，
 * 一份 280 KB 的响应在收据上只报 4 KB。
 *
 * `bytes` 数**真实响应**（`captureRaw` 抓到的原始 body，即 `RecordOutcome.rawPayload`
 * 那一份）：0 仍然只表示「一发都没打出去」；`sampleBytes` 数**展示样本**
 * （`RecordOutcome.payload`，裁剪 + 脱敏后）—— 只有它存在时才有。两份都用
 * 「序列化成 UTF-8 之后多少字节」这一种口径，与收据上其余数字同一个量纲。
 */
export const receiptBytesOf = (raw: JsonValue | undefined, payload: JsonValue | undefined): { bytes: number; sampleBytes?: number } => ({
  bytes: raw === undefined ? 0 : Buffer.byteLength(JSON.stringify(raw)),
  ...(payload === undefined ? {} : { sampleBytes: Buffer.byteLength(JSON.stringify(payload)) })
})
