import type { AmagiErrorCode } from '../contracts/error'

/**
 * 退避策略。
 *
 * 纯策略模块：不 import axios、不做 I/O，只回答两个问题
 * ——「这次失败该不该重试」与「该等多久」。
 *
 * 与 v6 `model/networks.ts` 的差异：
 * - v6 只在**抛出**了可恢复 errno 的 `AxiosError` 时才重试。因为它给 axios 传了
 *   `validateStatus: () => true`，429 与 5xx 根本不会抛错，所以从不重试
 *   —— 限频与平台过载在 v6 里是「一次就放弃」。v7 把这两类纳入退避。
 * - 退避的数值与节奏保持 v6 不变（1s / 2s / 4s），避免改变对平台的压力特征。
 */

/**
 * 可恢复的传输层 errno。
 *
 * 与 v6 `RECOVERABLE_ERROR_CODES` 逐字一致 —— 这张表决定「什么算网络抖动」，
 * 改动它等于改变对平台的重试压力，不在 v7 的范围内。
 */
export const RECOVERABLE_ERROR_CODES = [
  /** 连接被重置（代理切换、网络切换） */
  'ECONNRESET',
  /** 连接超时 */
  'ETIMEDOUT',
  /** 连接被拒绝 */
  'ECONNREFUSED',
  /** DNS 解析失败 */
  'ENOTFOUND',
  /** 网络不可达 */
  'ENETUNREACH',
  /** 主机不可达 */
  'EHOSTUNREACH',
  /** 管道破裂 */
  'EPIPE',
  /** DNS 临时失败 */
  'EAI_AGAIN',
  /** 连接中止 */
  'ECONNABORTED'
] as const

/** 可恢复的传输层 errno */
export type RecoverableErrorCode = (typeof RECOVERABLE_ERROR_CODES)[number]

/** 默认最大重试次数，与 v6 一致 */
export const DEFAULT_MAX_RETRIES = 3

/** 退避基数（毫秒），与 v6 一致 */
export const RETRY_DELAY_BASE_MS = 1000

/** 重试策略 */
export interface RetryPolicy {
  /** 最大重试次数。`0` 表示不重试（总共只发一次请求） */
  maxRetries?: number
  /** 退避基数（毫秒） */
  baseDelayMs?: number
}

/** 一次失败的归因，用来决定是否重试 */
export interface RetryInput {
  /** 已经发出的请求次数，首次请求为 `1` */
  attempt: number
  /** 传输层 errno（如 `ECONNRESET`）。HTTP 已经回来了就没有这一项 */
  errno?: string
  /** 平台返回的 HTTP 状态码。请求根本没发出去就没有这一项 */
  status?: number
  /** 重试策略 */
  policy?: RetryPolicy
}

/**
 * 判断 errno 是否属于可恢复的网络抖动
 * @param errno - 传输层错误码
 * @returns 可恢复则返回 `true`
 */
export const isRecoverableErrno = (errno?: string): errno is RecoverableErrorCode =>
  errno !== undefined && (RECOVERABLE_ERROR_CODES as readonly string[]).includes(errno)

/**
 * 判断 HTTP 状态码是否值得重试。
 *
 * `429`（限频）与 `5xx`（平台侧不可用）值得退避后再试；
 * `4xx` 的其余状态是请求本身的问题，重试不会变对。
 * @param status - HTTP 状态码
 * @returns 值得重试则返回 `true`
 */
export const isRetryableStatus = (status?: number): boolean => status !== undefined && (status === 429 || status >= 500)

/**
 * 计算第 `attempt` 次请求失败后应当等待的毫秒数。
 *
 * 指数退避：`base * 2^(attempt - 1)`，即 1s / 2s / 4s / 8s …
 * @param attempt - 刚刚失败的是第几次请求（首次为 `1`）
 * @param baseDelayMs - 退避基数
 * @returns 等待毫秒数
 */
export const backoffDelayMs = (attempt: number, baseDelayMs: number = RETRY_DELAY_BASE_MS): number =>
  baseDelayMs * 2 ** Math.max(0, attempt - 1)

/**
 * 这次失败对应的错误码，用于填 `RequestTrace.retryOf`
 * @param input - 失败归因
 * @returns amagi 错误码
 */
export const retryReasonCode = (input: Pick<RetryInput, 'errno' | 'status'>): AmagiErrorCode => {
  if (input.errno === 'ETIMEDOUT') return 'TIMEOUT'
  if (isRecoverableErrno(input.errno)) return 'NETWORK_ERROR'
  if (input.status === 429) return 'RATE_LIMITED'
  if (input.status !== undefined && input.status >= 500) return 'PLATFORM_UNAVAILABLE'
  return 'NETWORK_ERROR'
}

/** 重试决策 */
export type RetryDecision =
  | { retry: true; delayMs: number; reason: AmagiErrorCode }
  | { retry: false }

/**
 * 决定是否重试，以及等多久。
 *
 * 次数用尽、或失败原因本身不可重试（4xx、非可恢复 errno）时返回 `{ retry: false }`。
 * @param input - 失败归因与策略
 * @returns 重试决策
 */
export const decideRetry = (input: RetryInput): RetryDecision => {
  const maxRetries = input.policy?.maxRetries ?? DEFAULT_MAX_RETRIES
  if (input.attempt > maxRetries) return { retry: false }
  if (!isRecoverableErrno(input.errno) && !isRetryableStatus(input.status)) return { retry: false }

  return {
    retry: true,
    delayMs: backoffDelayMs(input.attempt, input.policy?.baseDelayMs),
    reason: retryReasonCode(input)
  }
}
