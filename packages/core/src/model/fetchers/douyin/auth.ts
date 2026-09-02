/**
 * 抖音登录认证相关 API（passport 扫码登录）
 *
 * 与其它 fetcher 的差别：这几个接口不走 `DouyinData` 的 URL 拼装 + a_bogus 流水线，
 * 因为 passport 体系有自己的三重 query 签名、独立的 a_bogus 形态与双重编码规则。
 * 对外形态保持一致：同样是 `(options, cookie?, requestConfig?) => Result<T>`，
 * 同样发 `apiSuccess` / `apiError` 事件，同样复用 amagi 的代理、超时与重试。
 *
 * 这几个方法都是无状态的：会话状态全部装在 cookie 串里，调用方拿到返回的 `cookie`
 * 后在下一次调用时传回来即可。轮询循环由调用方维护。
 *
 * @module fetchers/douyin/auth
 */

import { emitLogDebug } from 'amagi/model'
import { emitApiError, emitApiSuccess } from 'amagi/model/events'
import { DouyinPassportClient } from 'amagi/platform/douyin/passport'
import type { VerifyContext } from 'amagi/platform/douyin/passport'
import {
  parsePollResult,
  parseQrcode,
  parseSendCodeResult,
  parseValidateCodeResult,
  randomHex,
  xor5Hex
} from 'amagi/platform/douyin/passport'
import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { createErrorResponse, createSuccessResponse, Result } from 'amagi/validation'


/** 短信验证码的验证方式标识，服务端未给出可用方式时的兜底值 */
const SMS_VERIFY_WAY = 'mobile_sms_verify'

/**
 * 可以用「收 6 位验证码」这套流程走完的验证方式
 *
 * 除官方常见的 `mobile_sms_verify`，账号被判定需要辅助验证时会给出
 * `assist_mobile_sms_verify`，两者都是下行短信收码，走同一对
 * `send_code` / `validate_code` 接口，区别只在 `std_verify_way` 的取值。
 * 上行短信（`*_up_sms_verify`）要求用户从手机发短信出去，是另一套接口，不在此列。
 */
const SMS_CODE_WAY_PATTERN = /^(assist_)?mobile_sms_verify$/

/**
 * 判断某个验证方式能否用短信验证码流程完成
 * @param verifyWay 服务端下发的 verify_way
 */
const isSmsCodeVerifyWay = (verifyWay: string): boolean => SMS_CODE_WAY_PATTERN.test(verifyWay)

/**
 * 选出本次要用的 std_verify_way
 *
 * 优先用调用方指定的；否则从服务端给出的可选方式里挑一个能收码的；都没有才回退到默认值。
 * 之前这里写死 `mobile_sms_verify`，遇到辅助验证的账号会因为 way 对不上而失败。
 * @param verify 轮询下发的验证上下文
 * @param requested 调用方显式指定的验证方式
 */
const resolveVerifyWay = (verify: VerifyContext, requested?: string): string =>
  requested ??
  verify.verifyWays.find((way) => isSmsCodeVerifyWay(way.verifyWay))?.verifyWay ??
  verify.stdParams.std_verify_way ??
  SMS_VERIFY_WAY

/** 短信验证码的 act_type */
const SMS_ACT_TYPE = '3737'

/** 验证页 SDK 版本，随表单一起提交 */
const AUTHN_VERSION = '1.0.0.420-web'

/** 抖音 web 的 aid */
const AID = '6383'

/** 扫码成功后的跳转地址 */
const NEXT_URL = 'https://www.douyin.com'

/**
 * 以下四个别名对应 `DouyinReturnTypeMap` 里的 passport 条目，保留是为了让调用方
 * 能按 `Douyin<接口名>` 的习惯直接引用，定义本身只有 ReturnDataType 那一份。
 */

/** 登录二维码 */
export type DouyinPassportQrcode = DouyinReturnTypeMap['passportQrcode']

/** 二维码状态 */
export type DouyinPassportQrcodeStatus = DouyinReturnTypeMap['passportQrcodeStatus']

/** 发送短信验证码的结果 */
export type DouyinPassportSendCode = DouyinReturnTypeMap['passportSendCode']

/** 提交短信验证码的结果 */
export type DouyinPassportValidateCode = DouyinReturnTypeMap['passportValidateCode']

/** 二维码状态查询参数 */
export interface DouyinPassportQrcodeStatusOptions {
  /** `requestPassportQrcode` 返回的令牌 */
  token: string
}

/** 发送短信验证码参数 */
export interface DouyinPassportSendCodeOptions {
  /** 轮询返回 `status: 'verify'` 时给出的验证上下文 */
  verify: VerifyContext
  /** 追踪 ID，不传则自动生成 */
  biz_trace_id?: string
  /**
   * 本次使用的验证方式
   *
   * 不传则从 `verify.verifyWays` 里自动挑一个能收验证码的。服务端对不同账号会给出
   * 不同的取值（如 `mobile_sms_verify` 或辅助验证的 `assist_mobile_sms_verify`），
   * 必须原样回传，写死会导致验证失败。
   */
  verify_way?: string
}

/** 提交短信验证码参数 */
export interface DouyinPassportValidateCodeOptions extends DouyinPassportSendCodeOptions {
  /** 用户收到的 6 位验证码明文 */
  code: string
}

/**
 * 发码与验码共用的表单字段
 *
 * 字段顺序与「空值也要占位」的行为对齐官方验证页 SDK 的抓包形态：
 * `verify_ticket` / `new_verify_flow` / `std_verify_flow_id` / `std_verify_token`
 * 即使为空也必须出现，缺字段会被判为伪造请求。
 * @param verify 轮询下发的验证上下文
 * @param verifyWay 本次使用的验证方式，原样进 `std_verify_way`
 * @param tail 追加在 std_verify_way 之后的字段（发码是 is6Digits，验码是 code）
 */
const buildVerifyBody = (verify: VerifyContext, verifyWay: string, tail: Record<string, string>): Record<string, string> => ({
  mix_mode: '1',
  type: SMS_ACT_TYPE,
  encrypt_uid: verify.encryptUid,
  verify_ticket: verify.verifyTicket,
  copywriting_key: verify.copywritingKey,
  ies_safety_diversion_tag: verify.diversionTag,
  new_verify_flow: verify.newVerifyFlow,
  std_verify_flow_id: verify.stdParams.std_verify_flow_id ?? '',
  std_verify_scene: verify.stdParams.std_verify_scene ?? 'account_login',
  std_verify_template: verify.stdParams.std_verify_template ?? 'ato_web',
  std_verify_token: verify.stdParams.std_verify_token ?? '',
  std_verify_type: verify.stdParams.std_verify_type ?? 'MFA',
  std_verify_way: verifyWay,
  ...tail,
  aid: AID,
  new_authn_sdk_version: AUTHN_VERSION
})

/**
 * 构造 passport 侧的业务错误响应
 * @param methodType 方法名，进 amagiError.requestType
 * @param message 错误描述
 */
const passportError = (methodType: string, message: string) =>
  createErrorResponse(
    {
      code: 'UNKNOWN_ERROR',
      data: null,
      amagiError: { errorDescription: message, requestType: methodType, requestUrl: `https://login.douyin.com/passport/` },
      amagiMessage: message
    },
    message
  )

/** 统一包一层事件上报与异常兜底 */
const run = async <T>(methodType: string, task: () => Promise<Result<T>>): Promise<Result<T>> => {
  const startTime = Date.now()
  try {
    const result = await task()
    const duration = Date.now() - startTime
    if (result.code === 200) {
      emitApiSuccess({ platform: 'douyin', methodType, response: result, statusCode: 200, duration })
    } else {
      emitApiError({ platform: 'douyin', methodType, errorCode: result.code, errorMessage: result.message, duration })
    }
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    emitApiError({ platform: 'douyin', methodType, errorMessage, duration })
    throw new Error(`抖音登录请求失败: ${errorMessage}`)
  }
}

/**
 * 申请抖音扫码登录二维码
 *
 * 首次调用会自动完成环境指纹初始化（`__ac_nonce` + `ttwid`），无需额外准备。
 * @deprecated 请用 `client.douyin.login.qrcode()`（v7 会话抽象：
 *   取码 / 轮询 / challenge 由引擎编排，`expire_time` 秒转 `expiresAt` 毫秒）。
 * @param options - 请求选项 (可选)
 * @param cookie - 已有的会话 Cookie (可选，续用同一会话时传入)
 * @param requestConfig - 请求配置 (可选)
 * @returns 二维码令牌、内容与会话 cookie
 * @example
 * ```typescript
 * const qrcode = await requestPassportQrcode()
 * console.log(qrcode.data.content) // 拿去生成二维码图片
 * ```
 */
export async function requestPassportQrcode(
  options?: undefined,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<DouyinReturnTypeMap['passportQrcode']>> {
  return run('passportQrcode', async () => {
    const client = new DouyinPassportClient(cookie, requestConfig)
    await client.bootstrap()

    const response = await client.request('/passport/web/get_qrcode/', {
      next: NEXT_URL,
      need_short_url: 'true',
      need_logo: 'false',
      is_new_login: '1'
    })

    const qrcode = parseQrcode(response.body)
    if (!qrcode) {
      return passportError('passportQrcode', response.body.message || `获取二维码失败: ${response.raw.slice(0, 200)}`)
    }

    return createSuccessResponse(
      {
        token: qrcode.token,
        content: qrcode.content,
        expire_time: qrcode.expireTime,
        expires_in: Math.max(0, qrcode.expireTime - Math.floor(Date.now() / 1000)),
        cookie: response.cookie
      },
      '获取成功',
      200
    )
  })
}

/**
 * 查询抖音扫码登录二维码的状态
 *
 * 状态为 `confirmed` 时会自动跟随 SSO 跳转领取登录凭证，返回的 `cookie` 即完整登录态。
 * @deprecated 请用 `client.douyin.login.qrcode()`（v7 里状态归一化为
 *   `LoginState.phase`，轮询循环在引擎里）。
 * @param options - 二维码状态参数
 * @param options.token - `requestPassportQrcode` 返回的令牌
 * @param cookie - 会话 Cookie，必须是申请二维码时返回的那一份
 * @param requestConfig - 请求配置 (可选)
 * @returns 扫码状态与最新会话 cookie
 * @example
 * ```typescript
 * const status = await checkPassportQrcode({ token }, cookie)
 * // new 未扫码 / scanned 已扫待确认 / verify 需二次验证 / confirmed 登录成功 / expired 已过期
 * console.log(status.data.status)
 * ```
 */
export async function checkPassportQrcode(
  options: DouyinPassportQrcodeStatusOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<DouyinReturnTypeMap['passportQrcodeStatus']>> {
  return run('passportQrcodeStatus', async () => {
    if (!options?.token) return passportError('passportQrcodeStatus', '缺少 token 参数')

    const client = new DouyinPassportClient(cookie, requestConfig)
    const response = await client.request('/passport/web/check_qrconnect/', {
      next: NEXT_URL,
      need_logo: 'false',
      is_frontier: 'true',
      token: options.token,
      is_new_login: '1',
      need_short_url: 'true'
    })

    const result = parsePollResult(response.body)
    if (result.status === 'verify') {
      // 账号能用的验证方式因人而异，未知取值时这条日志是唯一的定位依据
      emitLogDebug(`[douyin passport] 触发二次验证，服务端原始响应: ${response.raw.slice(0, 1000)}`)
    }
    if (result.status === 'confirmed' && result.redirectUrl) {
      await client.followSsoRedirect(result.redirectUrl)
    }

    // 登录完成时返回不含本地会话状态的干净 cookie，中途状态则需带上以便下次调用续用
    const sessionCookie = result.status === 'confirmed' ? client.cookies.toString() : client.cookies.serialize()

    return createSuccessResponse({ ...result, cookie: sessionCookie, logged_in: client.cookies.isLoggedIn() }, '获取成功', 200)
  })
}

/**
 * 向账号绑定手机发送二次验证短信验证码
 *
 * 用于轮询返回 `status: 'verify'`（即 `error_code=2046` / `account_flow=verify`）的场景。
 * @deprecated 请用 `client.douyin.login.qrcode()` 的 `onChallenge` 回调
 *   （`challenge.sendCode()`，`biz_trace_id` / `verify_way` 由引擎维护）。
 * @param options - 发码参数
 * @param options.verify - 轮询返回的验证上下文
 * @param options.biz_trace_id - 追踪 ID (可选，不传自动生成)
 * @param cookie - 会话 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 脱敏手机号、重发等待秒数与追踪 ID
 */
export async function sendPassportVerifyCode(
  options: DouyinPassportSendCodeOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<DouyinReturnTypeMap['passportSendCode']>> {
  return run('passportSendCode', async () => {
    if (!options?.verify?.encryptUid) return passportError('passportSendCode', '缺少 encrypt_uid，请从轮询响应中取得验证上下文')

    const bizTraceId = options.biz_trace_id ?? randomHex(8)
    const verifyWay = resolveVerifyWay(options.verify, options.verify_way)
    emitLogDebug(`[douyin passport] 发码使用的验证方式: ${verifyWay}`)

    const client = new DouyinPassportClient(cookie, requestConfig)
    const response = await client.liteRequest(
      '/passport/web/send_code/',
      buildVerifyBody(options.verify, verifyWay, { is6Digits: '1' }),
      bizTraceId
    )

    const result = parseSendCodeResult(response.body)
    if (!result.ok) emitLogDebug(`[douyin passport] 发码失败原文: ${response.raw.slice(0, 500)}`)

    return createSuccessResponse({ ...result, cookie: response.cookie, biz_trace_id: bizTraceId, verify_way: verifyWay }, '获取成功', 200)
  })
}

/**
 * 提交二次验证的短信验证码
 * @deprecated 请用 `client.douyin.login.qrcode()` 的 `onChallenge` 回调
 *   （返回 `{ code }` 即可，`biz_trace_id` / `verify_way` 由引擎维护）。
 * @param options - 验码参数
 * @param options.verify - 轮询返回的验证上下文
 * @param options.code - 用户收到的 6 位验证码明文
 * @param options.biz_trace_id - 必须与发码时用的是同一个
 * @param cookie - 会话 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 验证结果；`wrongCode` 为 true 表示验证码填错，可以让用户重试
 */
export async function validatePassportVerifyCode(
  options: DouyinPassportValidateCodeOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<DouyinReturnTypeMap['passportValidateCode']>> {
  return run('passportValidateCode', async () => {
    if (!options?.verify?.encryptUid) return passportError('passportValidateCode', '缺少 encrypt_uid，请从轮询响应中取得验证上下文')
    if (!options.code) return passportError('passportValidateCode', '缺少 code，请填入收到的短信验证码')

    const client = new DouyinPassportClient(cookie, requestConfig)
    const response = await client.liteRequest(
      '/passport/web/validate_code/',
      // mix_mode=1 下验证码需按逐字节异或 5 转十六进制后提交
      buildVerifyBody(options.verify, resolveVerifyWay(options.verify, options.verify_way), { code: xor5Hex(options.code) }),
      options.biz_trace_id ?? randomHex(8)
    )

    const result = parseValidateCodeResult(response.body)
    if (!result.ok) emitLogDebug(`[douyin passport] 验码失败原文: ${response.raw.slice(0, 500)}`)
    return createSuccessResponse({ ...result, cookie: response.cookie }, '获取成功', 200)
  })
}
