import type { AmagiErrorCode, ErrorKind } from './error'
import type { Platform } from './platform'

/**
 * 可观测性契约。
 *
 * `AmagiMeta` 挂在每一个信封上（成功与失败都有），同时进事件负载。
 * 它把几件「看不见」的事变成肉眼可见的数字：
 * - `attempts`：一次调用实际打了多少个请求，含重试与分页的叠乘。
 * - `requestId` / `clientId`：多实例并发时可归因。
 * - 前置请求（换 guest cookie、取 wbi key）以 `reason: 'prepare'` 进 trace。
 */

/**
 * 一次底层请求的发起原因。
 *
 * 区分「端点内重试」与「传输层重试」、「翻页」与「分段并发」，
 * 是排查请求数叠乘的入口。
 */
export type TraceReason =
  /** 首次请求 */
  | 'initial'
  /** 传输层或 `retryOn` 触发的重试 */
  | 'retry'
  /**
   * 解出反爬挑战后的重放（`ChallengeSolver` 给出新 cookie，管线立即重发同一请求）。
   *
   * 与 `'retry'` 分开是**排障刚需**：两者此前共用 `'retry'`，于是「5 个请求是解了 4 次
   * 挑战、还是解了 1 次之后退避重试了 3 次」在 trace 上分不出来 —— 这两种猜法都能凑出
   * 同一个数字，2026-10-11 诊断抖音首页那条时只能靠插桩才定下来是后者。
   *
   * 它也不退避：解算重放是立刻发的（挑战页自己也只是 `location.reload()`），
   * 所以 `'challenge'` 那几条的间隔与 `'retry'` 的指数退避形状完全不同。
   */
  | 'challenge'
  /** 声明式翻页的第 n 页 */
  | 'page'
  /** 多请求聚合 / 分段并发里的一段 */
  | 'segment'
  /** `prepare` 阶段的前置请求：换 guest cookie、取 wbi key */
  | 'prepare'

/** 全部 6 个 `TraceReason`，顺序即声明顺序 */
export const TRACE_REASONS = ['initial', 'retry', 'challenge', 'page', 'segment', 'prepare'] as const satisfies readonly TraceReason[]

/** 单次底层 HTTP 请求的明细 */
export interface RequestTrace {
  /** 实际请求的 URL（含签名参数） */
  url: string
  /** HTTP 方法 */
  method: string
  /** 平台返回的状态码，请求未发出（如 DNS 失败）时缺失 */
  status?: number
  /** 这一次请求本身的耗时 */
  durationMs: number
  /** 这次请求为什么会发出 */
  reason: TraceReason
  /** `reason === 'retry'` 时，被重试的那次失败的错误码 */
  retryOf?: AmagiErrorCode
}

/** 挂在每个信封上的元信息 */
export interface AmagiMeta {
  /** 每次逻辑调用一个 id，贯穿事件、日志、trace */
  requestId: string
  /** 发起调用的 client 实例 id；静态 fetcher 用 `'static'` */
  clientId: string
  /** 平台 */
  platform: Platform
  /** 端点全名，如 `'douyin.videoWork'` */
  endpoint: string
  /** 从进入 fetcher 到返回信封的总耗时 */
  durationMs: number
  /** 实际发出的 HTTP 请求数，含重试与分页。分页 3 页 + 1 次重试 = 4 */
  attempts: number
  /**
   * 每次底层请求的明细，按发出顺序。
   *
   * 默认不带：`createClient({ debug: true })` 时才填（同一个开关也给失败信封
   * 填 `error.raw`，没有单独的 trace 开关）。不开时信封上**没有 `trace`
   * 这个键**，而 `attempts` 照样准确 —— 计数始终发生，只有明细受开关控制。
   *
   * 静态 fetcher（`amagi.douyinFetcher.*`）与 HTTP 服务的平台路由没有这个开关。
   * 要不受开关影响地逐条观测请求，监听 `http:request` / `http:response`
   * 事件：它们的负载恒带 `trace`。URL 含签名参数，别在生产里无条件打印。
   */
  trace?: RequestTrace[]
  /**
   * 结果不完整时的原因：翻页端点声明了 `partial: 'tolerate'`、中途某页失败，
   * 信封仍是成功、`data` 里是已取到的那几页，这里是那个失败页的错误。
   *
   * 完整结果上**没有这个键**。只看 `success` 的调用方会拿到截断的数据 ——
   * 在意条数的，检查这个键。没声明 `tolerate` 的翻页端点中途失败也返回部分结果，
   * 但**不**挂这个键，只能拿条目数与目标比对。
   */
  incomplete?: { kind: ErrorKind; code: AmagiErrorCode; message: string }
}

/** 静态 fetcher（不经过 client 实例）使用的 `clientId` */
export const STATIC_CLIENT_ID = 'static'
