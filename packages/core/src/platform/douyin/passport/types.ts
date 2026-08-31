/** 抖音扫码登录状态机的类型定义 */

/** 二维码信息 */
export interface QrcodeInfo {
  /** 轮询用的二维码令牌 */
  token: string
  /** 二维码承载的内容，优先用它渲染，缺失时回退到 token */
  content: string
  /** 有效期，毫秒 */
  expireTime: number
}

/** 二次验证上下文，字段全部来自轮询响应，原样透传给发码/验码接口 */
export interface VerifyContext {
  /** 加密后的用户 ID */
  encryptUid: string
  /** 验证票据 */
  verifyTicket: string
  /** 验证会话票据，缺失会被服务端判为伪造请求 */
  stdParams: Record<string, string>
  /** 文案场景，扫码登录固定为 qr_connect */
  copywritingKey: string
  /** 风控分流标记 */
  diversionTag: string
  /** 新版验证流标识 */
  newVerifyFlow: string
  /** 服务端给出的可选验证方式 */
  verifyWays: VerifyWay[]
}

/** 单个验证方式 */
export interface VerifyWay {
  /** 方式标识，如 mobile_sms_verify */
  verifyWay: string
  /** 该方式关联的手机号（已脱敏） */
  mobile?: string
}

/** 一次轮询的结果 */
export type PollResult =
  /** 尚未扫码 */
  | { status: 'new'; interval: number }
  /** 已扫码，等待手机端确认 */
  | { status: 'scanned'; interval: number }
  /** 已确认，可跟随 redirectUrl 领取登录凭证 */
  | { status: 'confirmed'; interval: number; redirectUrl: string }
  /** 二维码过期 */
  | { status: 'expired'; interval: number }
  /** 触发账号二次验证 */
  | { status: 'verify'; interval: number; verify: VerifyContext }
  /** 触发风控 */
  | { status: 'risk'; interval: number; message: string }
  /** 轮询被限频，退避后可继续用同一个 token 重试 */
  | { status: 'busy'; interval: number; message: string }
  /** 未知状态，原样保留服务端返回，便于排查 */
  | { status: 'unknown'; interval: number; message: string }

/** 发送短信验证码的结果 */
export interface SendCodeResult {
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

/** 提交短信验证码的结果 */
export interface ValidateCodeResult {
  /** 验证是否通过 */
  ok: boolean
  /** 验证码是否填错（可以让用户重试） */
  wrongCode: boolean
  /** 错误码 */
  errorCode?: number
  /** 描述 */
  message: string
}
