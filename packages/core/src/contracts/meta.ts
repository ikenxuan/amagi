import type { AmagiErrorCode } from './error'
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
  /** 声明式翻页的第 n 页 */
  | 'page'
  /** 多请求聚合 / 分段并发里的一段 */
  | 'segment'
  /** `prepare` 阶段的前置请求：换 guest cookie、取 wbi key */
  | 'prepare'

/** 全部 5 个 `TraceReason`，顺序即声明顺序 */
export const TRACE_REASONS = ['initial', 'retry', 'page', 'segment', 'prepare'] as const satisfies readonly TraceReason[]

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
}

/** 静态 fetcher（不经过 client 实例）使用的 `clientId` */
export const STATIC_CLIENT_ID = 'static'
