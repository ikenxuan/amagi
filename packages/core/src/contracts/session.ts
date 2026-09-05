import type { AmagiError } from './error'
import type { Platform } from './platform'
import type { RawResponse, RequestConfig, RequestSpec } from './request'

/**
 * 会话契约。
 *
 * 05-session-and-polling.md 的落地：登录会话是一等概念，与「单次请求的端点」
 * 并列。引擎（`runtime/session.ts`）负责轮询循环 / 退避 / 超时 / 取消 /
 * challenge 编排，平台策略（`platforms` 下各平台的 `session/qrcode.ts`）
 * 只写协议细节。
 *
 * `contracts/` 是零依赖叶子层：本文件只 type-import 同目录契约与外部包。
 */

/** 登录会话的状态。判别键是 phase */
export type LoginState =
  /** 二维码已就绪，等待扫码 */
  | { phase: 'pending'; qrcode: Qrcode }
  /** 已扫码，等待手机端确认 */
  | { phase: 'scanned'; qrcode: Qrcode }
  /** 需要二次验证，必须应答 challenge 才能继续 */
  | { phase: 'challenge'; challenge: LoginChallenge }
  /** 登录成功 */
  | { phase: 'success'; credential: Credential }
  /** 二维码过期，需要重新开始 */
  | { phase: 'expired' }
  /** 用户在手机端点了取消 */
  | { phase: 'rejected' }
  /** 触发风控 */
  | { phase: 'risk'; reason: string }
  /** 会话失败（网络、协议变更、内部错误） */
  | { phase: 'failed'; error: AmagiError }

/** 二维码 */
export interface Qrcode {
  /** 二维码承载的内容，直接拿去生成图片 */
  content: string
  /** 轮询令牌。B站是 qrcode_key，抖音是 token */
  token: string
  /** 绝对过期时刻，Unix 毫秒 */
  expiresAt: number
  /** 剩余秒数，取码时算出 */
  expiresInSec: number
}

/** 跨平台统一的登录凭证 */
export interface Credential {
  /** 完整登录态 cookie 串，可直接传给 fetcher */
  cookie: string
  /** 凭证过期时刻，能从 cookie 里解析出来时才有 */
  expiresAt?: number
  /** 平台原始产物（抖音的 sso 响应、B站的 Set-Cookie 数组等） */
  raw?: unknown
}

/** 短信验证码 challenge */
export interface SmsChallenge {
  kind: 'sms'
  /** 脱敏手机号，如 '138****8000' */
  maskedMobile: string
  /** 平台给出的可选验证方式，原样保留供排查 */
  availableWays: string[]
  /** 发送验证码。返回重发等待秒数 */
  sendCode(): Promise<{ ok: true; retryAfterSec: number } | { ok: false; error: AmagiError }>
}

/** 图形验证码 challenge */
export interface CaptchaChallenge {
  kind: 'captcha'
  imageUrl: string
  /** 极验/腾讯验证码等的初始化参数 */
  payload: Record<string, unknown>
}

/** 二次验证 challenge */
export type LoginChallenge = SmsChallenge | CaptchaChallenge

/**
 * 按 challenge 的 kind 决定应答的形状。
 *
 * 条件类型是「回调返回错字段编译期报错」的落点：
 * `c.kind === 'sms'` 收窄后 `C` 推断为 `SmsChallenge`，
 * `ChallengeAnswer<SmsChallenge>` 求值为 `{ code: string }`。
 */
export type ChallengeAnswer<C extends LoginChallenge> = C extends SmsChallenge
  ? { code: string }
  : C extends CaptchaChallenge
    ? { ticket: string; randstr?: string }
    : never

/** 会话回调（watch 出口） */
export interface WatchHandlers {
  /** 二维码就绪。同一个会话里只会调用一次 */
  onQrcode?: (qrcode: Qrcode) => void | Promise<void>
  /** 已扫码待确认 */
  onScanned?: () => void | Promise<void>
  /** 需要二次验证。返回值驱动状态机前进 */
  onChallenge?: <C extends LoginChallenge>(challenge: C) => ChallengeAnswer<C> | Promise<ChallengeAnswer<C>>
  /** 每次状态变化都会调用，用于日志 */
  onState?: (state: LoginState) => void
  /** 登录成功 */
  onSuccess?: (credential: Credential) => void | Promise<void>
  /** 终止性失败（expired / rejected / risk / failed） */
  onError?: (error: AmagiError, state: LoginState) => void | Promise<void>
}

/** 会话 watch 选项 */
export interface WatchOptions extends WatchHandlers {
  signal?: AbortSignal
  /** 整个会话的超时。默认取二维码的 expiresAt */
  timeoutMs?: number
  /** 轮询间隔的下限，防止服务端给出过小的 interval。默认 1000 */
  minIntervalMs?: number
}

/**
 * 平台会话上下文。
 *
 * 由引擎创建并逐次轮询更新；平台私有字段（biz_trace_id / verify_way /
 * verifyTicket / encryptUid / stdParams / newVerifyFlow / diversionTag…）
 * 放在 `data` 里由策略自己读写，引擎原样携带。
 */
export interface SessionCtx {
  /** 平台 */
  platform: Platform
  /** 会话 cookie（申请二维码时的那一份） */
  cookie: string
  /** 轮询令牌（抖音 token / B站 qrcode_key） */
  token?: string
  /** 二维码（start 之后一直带着） */
  qrcode?: Qrcode
  /** 调用方请求配置（代理、超时、额外请求头） */
  requestConfig?: RequestConfig
  /** transport 的 send，策略用它发请求（修 A5：不直连 axios） */
  send: (spec: RequestSpec, reason?: 'initial' | 'retry' | 'page' | 'segment' | 'prepare') => Promise<RawResponse>
  /** 平台私有状态，策略自读写 */
  data: Record<string, unknown>
}

/**
 * 平台扫码登录策略。
 *
 * 轮询循环 / 超时 / 退避 / 取消全在引擎里，策略只写协议细节。
 */
export interface QrcodeLoginStrategy {
  readonly platform: Platform
  /** 取二维码 */
  start(ctx: SessionCtx): Promise<{ ok: true; qrcode: Qrcode; ctx: SessionCtx } | { ok: false; error: AmagiError }>
  /** 单次轮询 */
  poll(ctx: SessionCtx): Promise<
    { ok: true; state: LoginState; ctx: SessionCtx; intervalMs: number } | { ok: false; error: AmagiError }
  >
  /** 应答 challenge（只有支持二次验证的平台需要实现） */
  answer?(ctx: SessionCtx, challenge: LoginChallenge, answer: unknown): Promise<
    { ok: true; ctx: SessionCtx } | { ok: false; error: AmagiError }
  >
  /** 从 opaque string 恢复 */
  deserialize(blob: string): SessionCtx
  /** 序列化为 opaque string */
  serialize(ctx: SessionCtx): string
}

/** 登录命名空间：qrcode() 创建会话，resume() 从 opaque string 恢复 */
export interface LoginNamespace {
  /** 创建扫码登录会话 */
  qrcode(options?: RequestConfig): LoginSession
  /** 从 `serialize()` 的产物恢复会话 */
  resume(blob: string): LoginSession
}

/**
 * 登录会话：三种消费方式（回调 / AsyncIterable / 手动单步）。
 *
 * 返回终态时永不 reject（除调用方回调自己抛出）。
 */
export interface LoginSession {
  /** 取二维码（手动单步的第一步） */
  start(): Promise<{ ok: true; state: LoginState; ctx: SessionCtx } | { ok: false; error: AmagiError }>
  /** 手动单步：轮询一次，推进状态机 */
  next(): Promise<{ ok: true; state: LoginState } | { ok: false; error: AmagiError }>
  /** challenge 阶段应答，推进状态机 */
  answer<C extends LoginChallenge>(answer: ChallengeAnswer<C>): Promise<void>
  /** 回调出口：一直跑到终态 */
  watch(options?: WatchOptions): Promise<{ ok: true; credential: Credential } | { ok: false; error: AmagiError }>
  /** 序列化为 opaque string（内部含 cookie + token + 平台标识 + 版本号） */
  serialize(): string
  /** AsyncIterable 出口：`for await (const state of session)` */
  [Symbol.asyncIterator](): AsyncIterator<LoginState>
}
