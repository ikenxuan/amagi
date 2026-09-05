/**
 * 前后端之间的**线上契约**。这个文件是两边唯一共享的东西。
 *
 * **它一个 import 都没有，而且必须保持这样。**
 *
 * 为什么不让前端直接 `import type` server 那半边的类型（那样声明处只有一个，看起来更好）：
 * 试过，不行。`import type` 在运行时确实被擦掉、不会有 core 的代码进浏览器包 ——
 * 但 **tsc 仍然要把整条 import 图编译一遍**，于是浏览器侧的 tsconfig（没有 `types: ["node"]`，
 * 那是它存在的理由）会去编译 core 的签名算法，然后报几十条
 * 「Cannot find name 'Buffer'」。`@ikenxuan/amagi-typegen` 也一样用 `node:crypto`。
 *
 * 所以契约必须**自己独立成一层**，两边各自 import 它。代价是 `JsonValue` 这类
 * 结构性类型在这里重新声明了一遍 —— 那不算重复：线上格式就是 JSON，
 * 它与 typegen 内部那份是两件不同的事（一份描述线协议，一份描述生成器的输入）。
 */

/** 线上能出现的任何 JSON 值 */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

/** JSON Schema 里前端认的那几个关键字。宽松放行其余字段 */
export interface FieldSchema {
  type?: string
  enum?: JsonValue[]
  const?: JsonValue
  description?: string
  default?: JsonValue
  [key: string]: unknown
}

/** 端点 params 的 JSON Schema（`zod.toJSONSchema(def.params, { io: 'input' })` 的结果） */
export interface ParamsSchema {
  properties?: Record<string, FieldSchema>
  required?: string[]
  [key: string]: unknown
}

/** 一个端点在清单里的样子 */
export interface EndpointInfo {
  /** 注册表里的键名，如 `videoWork` */
  name: string
  /** 端点文档里的一句话说明 */
  summary: string
  /** 参数表单由它派生 */
  schema: ParamsSchema
  /** 每个参数的可选取值（来自 `seeds.json`），表单预填用 */
  seeds: Record<string, readonly JsonValue[]>
  /** 本地已入库的样本数 */
  stored: number
  /** 参数矩阵能展开出多少组 —— 「一键补样本」会录这么多次 */
  combinations: number
  /** 必填但没有种子的参数名。非空 ⇒ 批量录不了 */
  unseeded: string[]
  /** 端点定义所在的源文件（仓库相对路径） */
  source: string
}

export interface PlatformInfo {
  platform: string
  /** **只有布尔，绝不回 cookie 本身**（PRD 七那条纪律） */
  hasCookie: boolean
  endpoints: EndpointInfo[]
}

/**
 * 一个平台的 cookie 状态。**这里一个字节的 cookie 值都没有。**
 *
 * 长度与来源是有用的（`sessionid=…` 少一截时看得出来、「这是 shell 里 export 的
 * 还是 `.env` 里的」决定改哪儿），而值本身在页面上没有任何用途 ——
 * 显示它只是多一个泄漏面（截图、录屏、贴日志）。
 */
export interface CookieStatus {
  platform: string
  /** 环境变量名，如 `AMAGI_COOKIE_DOUYIN` */
  envName: string
  hasCookie: boolean
  /** cookie 的字符数。0 表示没有 */
  length: number
  /**
   * 这个值从哪来。`env` = 进程环境变量（shell export / CI 注入，**改 `.env` 覆盖不了它**）；
   * `file` = `.env`；`none` = 两处都没有。
   */
  source: 'env' | 'file' | 'none'
}

/** `GET /api/cookies` 的结果 */
export interface CookiesResult {
  platforms: CookieStatus[]
  /**
   * `.env` 到底被 git 忽略了吗。**false 时前端必须拦住保存** ——
   * 往一个会被提交的文件里写 cookie 是不可撤销的错误。
   */
  envIsGitIgnored: boolean
  /** `.env` 的仓库相对路径，给提示文案用 */
  envPath: string
  /** `.env` 存在吗（不存在时保存会创建它） */
  envExists: boolean
}

/** `POST /api/cookies` 的结果 */
export interface SaveCookiesResult {
  written: number
  removed: number
  /** 保存后的最新状态，省一次往返 */
  status: CookiesResult
}

/**
 * 一段**在 server 侧渲好**的代码。前端直接 `dangerouslySetInnerHTML`，自己不做高亮。
 *
 * 为什么高亮在 Node 那一侧：shiki 打进浏览器包过不了体积门禁（仅底座 164 KB，
 * 而余量 133 KB），而 `server/` 从不打包，所以这条路上浏览器包增长 0 字节。
 * 完整的判据与实测数字在 `server/highlight.ts` 的文件头。
 */
export interface HighlightedCode {
  /** shiki 渲出来的 HTML（`<pre class="shiki">…`）。双主题变量，配色由 CSS 选，见 `CodeBlock.tsx` */
  html: string
  /** `html` 里实际渲了多少个字符 */
  chars: number
  /**
   * 原文一共多少个字符。**大于 `chars` ⇒ 尾巴被截掉了，界面必须把这件事说出来。**
   *
   * 两个数一起回而不是只回 HTML：一份 1.3 MB 的响应渲出来会让页面卡死，所以截断是必须的；
   * 而 PRD 阶段 5 专门记了「那两处硬截断悄悄吃掉数据」—— 无声的截断是要修的东西，不是要抄的。
   */
  totalChars: number
}

/** diff 的一行。结构化而不是拼好的字符串 —— 前端要按增删上色 */
export interface DiffLine {
  /** 产物相对路径 */
  file: string
  sign: '+' | '-'
  text: string
}

/** 一次录制的结果 */
export interface RecordOutcome {
  /**
   * 能不能入库。**判据是「脱敏没有残留」而不是「判定通过」** ——
   * 判定拒掉的样本连 sample 都拿不到；而判定通过、脱敏却留了原值的样本，
   * 写出去就收不回来了。
   */
  ok: boolean
  /** 入库判定的结论与理由。`confident: false` 表示判定器在这份响应上没有依据 */
  verdict: { kind: string; reason: string; confident?: boolean }
  /** 待定样本 id。**只有 `ok` 时才有** —— 没有它前端就没有「留下」这个动作可点 */
  pendingId?: string
  /** 脱敏统计。**只有数量与路径，没有原值** —— 短值的截断哈希能爆破 */
  scrub?: { replacements: number; suspects: string[]; leaks: string[] }
  /** 脱敏后的响应（`normalized` 优先），给「响应 JSON」那块面板 */
  payload?: JsonValue
  /**
   * 同一份 `payload`，已经高亮好的那一份（`JSON.stringify(payload, null, 2)` 之后过 shiki）。
   *
   * **`payload` 仍然回**，两者不是替代关系：原始值是数据（将来要按字段做对比、要 pick 路径），
   * 这一份只是显示。哪天面板不显示 JSON 了，删掉的应该是这一份。
   */
  payloadHighlight?: HighlightedCode
  /** 「即将写入的类型 diff」那块面板 */
  diff?: DiffLine[]
  /**
   * 这份样本**带来新形状了吗**。`false` ⇒ 它对类型的贡献是零，可以直接丢掉。
   *
   * 为什么不让前端自己判「diff 是不是空的」：产物文件头里有溯源块
   * （几份样本、参数哈希、录制日期），所以多录一份样本必然让 diff 至少多两行注释 ——
   * 哪怕形状一模一样。这个字段只数形状行，注释行不算。
   */
  shapeChanged?: boolean
  /** 会让下游编译红的那些变更 */
  breaking?: string[]
  /** 一发都没打出去时的错误文案 */
  message?: string
}

/** `/api/record-batch` 的结果 */
export interface BatchResult {
  /** 缺种子的参数名。非空时一组都没录 */
  unseeded: string[]
  /** 参数矩阵的告知性信息（比如组合数被截断了） */
  notes: string[]
  outcomes: RecordOutcome[]
}

/** `/api/generate` 的结果 */
export interface GenerateResult {
  /** 写出的产物路径（相对产物根） */
  written: string[]
  /**
   * 清理掉的残留产物路径。
   *
   * 布局翻转时（补一份样本让判别式忽然可发现，`Comments_V0.ts` 变成
   * `guards.ts` + `<取值>/…`）上一次的文件必须消失 —— 留着的话平台 barrel 仍然导出它，
   * `tsc` 全绿而下游拿到的是旧类型。空数组是常态。
   */
  removed: string[]
  warnings: string[]
  summary: string[]
  /**
   * 这个动作**做不到**的那件事，每次都回。
   *
   * 放在契约里而不是靠前端拼：前端原先只在「没有 warnings」时才说这句，
   * 而样本超 90 天、注释孤立、样本读不了都很常见，于是这句最该说的话恰好被顶掉；
   * curl 用户则从来没见过它。
   */
  note: string
}

/* ------------------------------------------------------------------ 请求集合 */

/**
 * 一条请求记录的结论。**与 `packages/typegen/src/requests.ts` 的 `REQUEST_VERDICTS` 同值。**
 *
 * 手抄一份是那条零 import 铁律的代价（见文件头）。两份不会静默错开 ——
 * `server/index.ts` 两个方向各顶着一头：`/api/requests` 把校验器回的集合
 * `satisfies RequestsResult`（typegen ⊆ 契约），又把契约的 {@link RequestEntry}
 * 喂给 `appendRequest`（契约 ⊆ typegen）。任一边多一个取值，`pnpm typecheck` 就红。
 */
export type RequestVerdict = 'ok' | 'reject:risk-control' | 'reject:login' | 'reject:empty'

/**
 * 请求集合里的一条记录（`corpus/<平台>/<端点>.requests.json`）。
 *
 * **这是唯一进 git 的那一半：值是真值、不脱敏。** 所以只放公开内容（公开作品、公开账号、
 * 搜索关键词），凭证永不进 —— 后一条由校验器强制（命中就整条不收），不靠界面自觉。
 */
export interface RequestEntry {
  /** 人给的短名。**它会变成产物的目录名与类型名**，所以不是哈希。字符集卡在校验器上 */
  id: string
  /** 中文说明，渲染在界面上。空串会被校验器拒 —— 空标签占着位置，看起来像已经写过说明了 */
  label: string
  /** **真值。** 照着它就能把这个请求重放一遍，那是这个文件存在的全部理由 */
  params: Record<string, JsonValue>
  /** ISO 8601 UTC，**到秒** —— 与样本 `metadata.recordedAt` 同一种写法，两边要能对着看 */
  recordedAt: string
  verdict: RequestVerdict
  /**
   * 对应本地 corpus 里那份样本的文件名（12 位十六进制）。**样本不进 git，所以这只是个指针。**
   * 没有它是正常状态：被入库判定拒了的请求压根没生成样本。
   */
  sampleHash?: string
  /**
   * 形状指纹（`sk1-` + 16 位十六进制）。两条记录同指纹 ⇒ 类型逐字节相同 ⇒ 可以建议合并。
   *
   * **这个值只由 server 算**（`shapeKeyOfSamples`，产侧在 `packages/typegen/src/shape.ts`）——
   * `POST /api/requests` 忽略请求体里的 `shapeKey`，那条路上的整套理由写在 `server/index.ts`
   * 的 `upsert` 那段上。要点：算它得跑生成器，而它落进的是进 git 的文件，一个错的指纹会让
   * 上面那句「建议合并」对着两份类型不同的样本说「可以合并」。
   *
   * **没有它是正常状态**（同 {@link sampleHash}）：被拒的请求压根没生成样本，算不出指纹。
   * 界面上那一列因此不能留白 —— 空着说的是「还没人算过」，不是「这一组的形状没有指纹」。
   *
   * 前缀是刻意与 {@link sampleHash} 那 12 位纯十六进制分开的：两个字段紧挨着躺，
   * 只靠长度区分的话错位之后没有任何东西会报错，而 `sampleHash` 恰好是样本文件名。
   */
  shapeKey?: string
  /** 补充说明，通常是「拿回了什么」。被拒的那几条全靠它传递信息 */
  note?: string
}

/** 一整份请求集合。`$comment` 是约定的注释键（JSON 没有注释） */
export interface RequestCollection {
  $comment?: string | readonly string[]
  version: number
  /** `<平台>/<端点>`，例如 `bilibili/videoInfo` */
  endpoint: string
  requests: RequestEntry[]
}

/** `POST /api/requests` 的结果 */
export interface RequestsResult {
  /** 集合文件的仓库相对路径。**没写成时也回**（`absent` 那一档），人要知道说的是哪个文件 */
  path: string
  /** 动作**之后**盘上那一份（`read` 就是现在那一份）。界面直接拿它刷列表，省一次往返 */
  collection: RequestCollection
  /**
   * 这次动作到底改变了什么。
   *
   * `absent` 是 `remove` 一个不存在的 `id` —— **那也回 200**（幂等，同 `/api/discard`
   * 那条既有约定），而且不写盘：写一遍只会把这个进 git 的文件白刷一次 diff。
   */
  effect: 'read' | 'added' | 'replaced' | 'removed' | 'absent'
  /**
   * 集合文件自身的问题（坏 JSON、坏条目）。
   *
   * 只有 `read` 会带着它回 200 —— 读的时候「这个文件坏了」正是最该说出来的话。
   * 写那几档在有问题时一律 4xx（拒绝覆盖一份没读懂的文件），所以那时这里必定是空的。
   */
  issues: string[]
}

/** `/api/store` 的结果 */
export interface StoreResult {
  /** 样本写到哪儿了（仓库相对路径）。人要能把这句话粘进 `git status` 去找 */
  written: string
  /**
   * 请求集合里那一条追加进去了吗。
   *
   * **`false` 时 {@link requestsIssues} 必定非空**，而且样本已经写了 —— 两件事分开报是
   * 刻意的：参数进 git 是 PRD 的核心诉求，而「留下样本」是这个工具最常用的动作，
   * 一个没成不该假装另一个也没成，更不该静默。
   */
  requestsAppended: boolean
  /** 集合文件的仓库相对路径。**只有真追加了才有** */
  requestsPath?: string
  /** 追加时替换掉了同 `id` 的旧条目（而不是追加了第二条） */
  requestsReplaced?: boolean
  /** 集合没动的原因：没给 `id` / 凭证命中 / 盘上那份读不了。`requestsAppended: false` 时必定非空 */
  requestsIssues: string[]
}

/** `/api/discard` 的结果。`existed: false` 也回 200 —— 「丢掉」这个动作在语义上是幂等的 */
export interface DiscardResult {
  discarded: boolean
  existed: boolean
}

/**
 * 一个**已提交**的类型产物文件。
 *
 * 「已提交」是这块面板的全部意义：界面原先对「这个端点已经有类型了」一无所知，
 * 于是人只能靠翻 `packages/response-types/` 判断自己是不是在重复劳动。
 */
export interface GeneratedFile {
  /** 相对产物根（`packages/response-types/src/generated/`）的路径，`/` 分隔 */
  path: string
  code: HighlightedCode
}

/** `GET /api/generated` 的结果 */
export interface GeneratedResult {
  platform: string
  endpoint: string
  /**
   * 这个端点现在有哪些产物。
   *
   * **空数组是正常状态**（61 个端点里只有 12 个生成过），所以那种情况不是 404 ——
   * 回 404 会让前端把「还没生成过类型」显示成一条错误，而它是这个工具最常见的起点。
   */
  files: GeneratedFile[]
  /** 读盘时出的问题（某个产物读不了）。空数组 = 都好，其中包括「一个产物都没有」 */
  issues: string[]
}

/* ------------------------------------------------------------------ 两组参数的对比 */

/**
 * 一处字段级差异。**方向词在这里是 `left` / `right`，不是 `generated` / `handwritten`。**
 *
 * 底下那份实现（`packages/typegen/src/flatten.ts:129` 的 `FieldDiff`）四个 `kind` 里有两个叫
 * `only-generated` / `only-handwritten` —— 那套词是为「生成 vs 手写」那张迁移清单起的，
 * 而且**方向是它刻意的语义**（`flatten.ts:148-155`：`only-handwritten` 是要人决策的一类）。
 * 这条接口比的是**同一个端点的两组参数**，两边都是生成的。原样透出去的话，界面上会写着
 * 「只有手写的有」而这里根本没有手写的一侧 —— 那不是措辞不好，是把答案说成了另一件事。
 *
 * 所以在 `server/compare.ts` 那个接缝上映射一层。代价是两套词，而它们**不会静默错开**：
 * 那张映射表声明成 `Record<FieldDiff['kind'], CompareFieldDiff['kind']>`，typegen 那边多一个
 * 取值就少一个键、`pnpm typecheck` 当场红（同 {@link RequestVerdict} 那条两头对顶）。
 */
export interface CompareFieldDiff {
  /** 字段路径。对象键用 `.` 连、跨数组加 `[]`，如 `data.pages[].dimension.width` */
  path: string
  kind:
    | /** 只有左边那组参数的类型里有 */ 'only-left'
    | /** 只有右边那组参数的类型里有 */ 'only-right'
    | /** 两边都有，类型不一样 —— 「`string` 变成了 `string \| null`」落在这一类 */ 'type'
    | /** 两边都有，可选性不一样 */ 'optionality'
  /**
   * 左边这一侧的说法，随 `kind` 变：`type` 时是渲染出来的类型表达式（`string | null`）、
   * `optionality` 时是 `必需` / `可选`、`only-right` 时**这个键整个不在**（那一侧没有这个字段）。
   */
  left?: string
  /** 右边这一侧的说法。规则同 {@link left}，`only-left` 时不在 */
  right?: string
}

/** 参与对比的一边 */
export interface CompareSide {
  /**
   * 样本文件名那 12 位十六进制（`metadata.paramsHash`）。**回的是真正比了的那一份**，
   * 不是请求里那个字符串 —— 两者一致是现在的实现，但这个字段该回答「比的是谁」。
   */
  sampleHash: string
  /**
   * 这一组参数**单独**生成的类型源码，已在 server 侧高亮。
   *
   * 「单独」是要紧的，见 {@link CompareResult.note}：它比合并出来的类型更严。
   */
  code: HighlightedCode
  /** 摊平之后这一侧有多少个字段。与 `same` 一起才读得懂差异清单的规模 */
  fields: number
  /**
   * 因为类型自引用而没有继续下钻的路径（`Reply.replies: Reply[]` 这种）。
   *
   * **空数组是常态**；非空表示这些路径**底下没有比过** —— 那是一处必须说出来的截断，
   * 同 {@link HighlightedCode.totalChars} 那条约定。
   */
  recursive: string[]
}

/** `POST /api/compare` 的结果 */
export interface CompareResult {
  platform: string
  endpoint: string
  left: CompareSide
  right: CompareSide
  /** 逐字段差异，按路径排序 */
  diffs: CompareFieldDiff[]
  /** 两边一致的字段数 —— 差异清单的分母，不给分母没法判断「差异小到可以合并」 */
  same: number
  /** 各类差异的条数，给一眼看的结论。数的就是 {@link diffs} 里那些 */
  counts: Record<CompareFieldDiff['kind'], number>
  /**
   * 这个结果**做不到**的那件事，每次都回（同 {@link GenerateResult.note} 那条约定）。
   *
   * 说的是 PRD 4.3：两边都是**单份样本单独生成**的类型，比合并出来的更严 ——
   * 于是差异清单里有一部分是「样本量不够」的影子，不是平台真的改了字段。
   * 放在契约里而不是让前端拼：curl 用户也该看到这句，而前端忘了写这句的代价是
   * 有人照着一份假差异去改类型。
   */
  note: string
}
