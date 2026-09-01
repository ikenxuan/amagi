/**
 * 错误契约。
 *
 * 全仓唯一的错误载体。v6 的 `Result.error` 实测有三种形状
 * （`undefined` / `ErrorDetail` / `APIErrorType`）且互相没有公共字段，
 * 导致调用方写不出一段跨平台通用的错误处理代码；v7 收敛到 `AmagiError` 一种。
 *
 * `contracts/` 是零依赖叶子层，本文件不 import 仓库内任何其他模块。
 */

/**
 * 跨平台统一的错误大类，也是调用方唯一需要 `switch` 的判别键。
 *
 * 粗粒度归因用 `kind`，细粒度归因用 {@link AmagiErrorCode}。
 */
export type ErrorKind =
  /** 入参不合法，本地就能判定，没有发出请求 */
  | 'validation'
  /** 需要登录 / cookie 失效 / 身份不足 */
  | 'auth'
  /** 限频，退避后可重试 */
  | 'rate_limit'
  /** 风控、验证码、需要人工介入 */
  | 'risk'
  /** 资源不存在、已删除、已下架 */
  | 'not_found'
  /** 有身份但无权限：地区限制、付费内容、隐私设置 */
  | 'forbidden'
  /** 平台侧不可用：5xx、维护、过载 */
  | 'unavailable'
  /** 传输层失败：连接重置、DNS、代理 */
  | 'network'
  /** 超时 */
  | 'timeout'
  /** 响应拿到了但解析不了：非 JSON、protobuf 损坏、反爬 HTML */
  | 'parse'
  /** amagi 自身的 bug */
  | 'internal'
  /** 平台返回了没见过的错误码 */
  | 'unknown'

/**
 * 稳定的字符串错误码，可用于 `switch` 与埋点。
 *
 * 刻意不用 `enum`：v6 的 `bilibiliAPIErrorCode` 用字符串 `'-101'` 去比数字 `-101`，
 * `xiaohongshuAPIErrorCode` 混合 enum 又让 `Object.values()` 泄漏反向映射键，
 * 两处都是 enum 带来的。
 */
export type AmagiErrorCode =
  // validation
  | 'PARAM_INVALID'
  | 'PARAM_MISSING'
  // auth
  | 'COOKIE_MISSING'
  | 'COOKIE_EXPIRED'
  | 'LOGIN_REQUIRED'
  // rate_limit / risk
  | 'RATE_LIMITED'
  | 'RISK_CONTROL'
  | 'CAPTCHA_REQUIRED'
  // resource
  | 'NOT_FOUND'
  | 'DELETED'
  | 'PRIVATE'
  | 'GEO_RESTRICTED'
  | 'PAID_CONTENT'
  // platform / transport
  | 'PLATFORM_ERROR'
  | 'PLATFORM_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  // decode
  | 'EMPTY_RESPONSE'
  | 'DECODE_FAILED'
  | 'ANTIBOT_PAGE'
  // internal
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR'

/** `kind === 'validation'` 时的字段级错误 */
export interface ValidationIssue {
  /** 点号路径，如 `'verify.stdParams.token'` */
  path: string
  /** 面向人的说明 */
  message: string
  /** 收到的值，用于排查 */
  received?: unknown
}

/** 失败信封里唯一的错误载体，永不为 `undefined` */
export interface AmagiError {
  /** 判别键，跨平台统一的错误大类 */
  kind: ErrorKind
  /** 稳定的字符串错误码，可用于 switch 与埋点 */
  code: AmagiErrorCode
  /** 面向人的说明，取平台原文优先 */
  message: string
  /** 是否值得重试。调用方据此决定退避还是放弃 */
  retryable: boolean
  /** 平台原始错误码与文案，一个字都不丢 */
  platform?: { code: string | number; message?: string }
  /** 真实发生的 HTTP 状态（有请求才有） */
  http?: { status: number; statusText?: string }
  /** `kind === 'validation'` 时的字段级错误 */
  issues?: ValidationIssue[]
  /** 原始响应体。默认不带，client 开 debug 时才填 */
  raw?: unknown
  /** 底层 Error 对象，仅用于日志 */
  cause?: unknown
}

/**
 * `kind` → `retryable` 的默认推导表。
 *
 * `satisfies Record<ErrorKind, boolean>` 保证漏掉任何一个 kind 都是编译错误 ——
 * 这张表与 {@link ErrorKind} 不可能漂移。端点可以用 `JudgeVerdict.retryable` 覆盖。
 */
const RETRYABLE_BY_KIND = {
  /** 入参错了，重试不会变对 */
  validation: false,
  /** 换凭证才有用 */
  auth: false,
  /** 退避后重试有意义 */
  rate_limit: true,
  /** 可重试，但需要更长退避，且连续命中应停手 */
  risk: true,
  not_found: false,
  forbidden: false,
  /** 平台侧临时不可用 */
  unavailable: true,
  network: true,
  timeout: true,
  parse: false,
  internal: false,
  /** 没见过的错误码，保守起见不重试 */
  unknown: false
} as const satisfies Record<ErrorKind, boolean>

/** 全部 12 个 `ErrorKind`，用于遍历与穷尽性测试。顺序即 {@link ErrorKind} 的声明顺序 */
export const ERROR_KINDS = Object.keys(RETRYABLE_BY_KIND) as readonly ErrorKind[]

/**
 * 按 `kind` 推导默认的 `retryable`
 * @param kind - 错误大类
 * @returns 该类错误默认是否值得重试
 */
export const isRetryableKind = (kind: ErrorKind): boolean => RETRYABLE_BY_KIND[kind]

/**
 * 每个错误码的兜底文案。
 *
 * `AmagiError.message` 取平台原文优先，平台没给文案时用这里的兜底
 * —— 保证 `message` 永远是一句人能读的话，而不是空串或 `undefined`。
 */
export const DEFAULT_ERROR_MESSAGES = {
  PARAM_INVALID: '参数不合法',
  PARAM_MISSING: '缺少必填参数',
  COOKIE_MISSING: '未提供 cookie',
  COOKIE_EXPIRED: '登录状态已失效',
  LOGIN_REQUIRED: '该接口需要登录',
  RATE_LIMITED: '请求过于频繁，请稍后再试',
  RISK_CONTROL: '触发平台风控',
  CAPTCHA_REQUIRED: '需要完成验证码',
  NOT_FOUND: '资源不存在',
  DELETED: '资源已删除或已下架',
  PRIVATE: '资源为私密状态',
  GEO_RESTRICTED: '资源受地区限制',
  PAID_CONTENT: '资源为付费内容',
  PLATFORM_ERROR: '平台返回了错误',
  PLATFORM_UNAVAILABLE: '平台服务暂时不可用',
  NETWORK_ERROR: '网络请求失败',
  TIMEOUT: '请求超时',
  EMPTY_RESPONSE: '平台返回了空响应',
  DECODE_FAILED: '响应解析失败',
  ANTIBOT_PAGE: '平台返回了反爬页面',
  INTERNAL_ERROR: 'amagi 内部错误',
  UNKNOWN_ERROR: '未知错误'
} as const satisfies Record<AmagiErrorCode, string>

/**
 * 取某个错误码的兜底文案
 * @param code - 错误码
 * @returns 兜底文案
 */
export const errorMessageFor = (code: AmagiErrorCode): string => DEFAULT_ERROR_MESSAGES[code]

/** 平台判定的结论 */
export interface JudgeVerdict {
  /** 是否视为成功 */
  ok: boolean
  /** 失败时的错误大类 */
  kind?: ErrorKind
  /** 失败时的细粒度错误码 */
  code?: AmagiErrorCode
  /** 覆盖 {@link isRetryableKind} 的默认推导 */
  retryable?: boolean
}

/**
 * 平台响应判定函数。
 *
 * 每个平台一份纯函数，把原始响应映射为「成功」或一个错误分类。
 * **这是全仓唯一判定成败的地方**，取代 v6 里 4 个 `internal.ts` 的
 * `if (rawData.xxx)` 与 4 个 `GlobalGetData` 里的重复逻辑。
 */
export type Judge = (raw: unknown, http: { status: number }) => JudgeVerdict
