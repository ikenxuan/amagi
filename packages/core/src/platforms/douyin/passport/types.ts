/**
 * 抖音扫码登录状态机的类型定义
 *
 * 对外可见的结果类型统一定义在 `amagi/types/ReturnDataType/Douyin/PassportLogin`，
 * 这里只做别名，保证协议层与 fetcher 的返回类型是同一份定义。
 */
import type {
  DyPassportPollResult,
  DyPassportSendCodeResult,
  DyPassportValidateCodeResult,
  DyPassportVerifyContext,
  DyPassportVerifyWay
} from '../../../types/ReturnDataType/Douyin/PassportLogin'

/** 二维码信息，`get_qrcode` 的解析结果 */
export interface QrcodeInfo {
  /** 轮询用的二维码令牌 */
  token: string
  /** 二维码承载的内容，优先用它渲染，缺失时回退到 token */
  content: string
  /**
   * 二维码过期时间，服务端给的是**绝对 Unix 时间戳（秒）**而非时长
   *
   * 实测二维码只有约 60 秒有效期，调用方应据此设置扫码等待上限。
   */
  expireTime: number
}

/** 二次验证上下文 */
export type VerifyContext = DyPassportVerifyContext

/** 单个验证方式 */
export type VerifyWay = DyPassportVerifyWay

/** 一次轮询的结果 */
export type PollResult = DyPassportPollResult

/** 发送短信验证码的结果 */
export type SendCodeResult = DyPassportSendCodeResult

/** 提交短信验证码的结果 */
export type ValidateCodeResult = DyPassportValidateCodeResult
