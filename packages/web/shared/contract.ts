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
