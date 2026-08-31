/**
 * 抖音 passport 扫码登录的返回类型
 *
 * 与其它返回类型不同，这几个不是服务端原始 JSON 的映射，而是登录状态机归一化之后的结果：
 * passport 的原始响应会把状态散落在 `data.status`、`data.error_code`、`data.account_flow`
 * 三处，且同一种情况有多套表达。协议层把它们收敛成一个可判别联合，调用方只需 `switch`
 * 一次即可覆盖全部分支。
 */

/** 二次验证的一种可选方式 */
export interface DyPassportVerifyWay {
  /** 方式标识，如 `mobile_sms_verify` */
  verifyWay: string
  /** 该方式关联的手机号（已脱敏） */
  mobile?: string
}

/**
 * 二次验证上下文
 *
 * 字段全部来自轮询响应，需原样透传给发码与验码接口，缺字段会被判为伪造请求。
 */
export interface DyPassportVerifyContext {
  /** 加密后的用户 ID */
  encryptUid: string
  /** 验证票据 */
  verifyTicket: string
  /** 验证会话票据 */
  stdParams: Record<string, string>
  /** 文案场景，扫码登录固定为 `qr_connect` */
  copywritingKey: string
  /** 风控分流标记 */
  diversionTag: string
  /** 新版验证流标识 */
  newVerifyFlow: string
  /** 服务端给出的可选验证方式 */
  verifyWays: DyPassportVerifyWay[]
}

/** 一次二维码轮询的归一化结果 */
export type DyPassportPollResult =
  /** 尚未扫码 */
  | { status: 'new'; interval: number }
  /** 已扫码，等待手机端确认 */
  | { status: 'scanned'; interval: number }
  /** 已确认，可跟随 `redirectUrl` 领取登录凭证 */
  | { status: 'confirmed'; interval: number; redirectUrl: string }
  /** 二维码过期 */
  | { status: 'expired'; interval: number }
  /** 触发账号二次验证 */
  | { status: 'verify'; interval: number; verify: DyPassportVerifyContext }
  /** 触发风控 */
  | { status: 'risk'; interval: number; message: string }
  /** 轮询被限频，退避后可继续用同一个 token 重试 */
  | { status: 'busy'; interval: number; message: string }
  /** 未知状态，原样保留服务端返回，便于排查 */
  | { status: 'unknown'; interval: number; message: string }

/** 登录二维码 */
export interface DyPassportQrcode {
  /** 轮询用的二维码令牌 */
  token: string
  /** 二维码承载的内容，直接拿去生成图片 */
  content: string
  /**
   * 二维码过期时间，服务端原值，是**绝对 Unix 时间戳（秒）**而非时长
   *
   * 想要剩余秒数请直接用 `expires_in`。
   */
  expire_time: number
  /** 距离二维码过期还剩多少秒，取二维码时算出，实测约 60 秒 */
  expires_in: number
  /** 本次会话 cookie，后续调用需原样传回 */
  cookie: string
}

/** 二维码状态 */
export type DyPassportQrcodeStatus = DyPassportPollResult & {
  /** 最新会话 cookie；`confirmed` 时已包含 sessionid / sid_guard 等登录凭证 */
  cookie: string
  /** cookie 里是否已具备登录态凭证 */
  logged_in: boolean
}

/** 发码接口归一化后的结果，不含会话字段 */
export interface DyPassportSendCodeResult {
  /** 是否发送成功 */
  ok: boolean
  /** 服务端返回的脱敏手机号 */
  mobile: string
  /** 允许重新发送的等待秒数 */
  retryAfter: number
  /** 失败时的错误码 */
  errorCode?: number
  /** 失败时的描述 */
  message: string
}

/** 发送短信验证码的结果 */
export type DyPassportSendCode = DyPassportSendCodeResult & {
  /** 最新会话 cookie */
  cookie: string
  /** 本次验证流程的追踪 ID，提交验证码时必须传回同一个值 */
  biz_trace_id: string
  /** 本次实际使用的验证方式，提交验证码时应传回同一个值 */
  verify_way: string
}

/** 验码接口归一化后的结果，不含会话字段 */
export interface DyPassportValidateCodeResult {
  /** 验证是否通过 */
  ok: boolean
  /** 验证码是否填错（可以让用户重试） */
  wrongCode: boolean
  /** 错误码 */
  errorCode?: number
  /** 描述 */
  message: string
}

/** 提交短信验证码的结果 */
export type DyPassportValidateCode = DyPassportValidateCodeResult & {
  /** 最新会话 cookie */
  cookie: string
}
