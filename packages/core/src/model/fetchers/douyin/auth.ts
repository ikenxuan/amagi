/**
 * 抖音登录认证相关 API（桌面 IM Passport 扫码登录）
 *
 * 与其它 fetcher 的差别：这几个接口不走 `DouyinData` 的 URL 拼装 + a_bogus 流水线，
 * passport 体系有自己的桌面链路（imdesktop.douyin.com，aid 339757，jumpbyte a_bogus
 * 签名 + aid-sign 请求头）。对外形态保持一致：同样是 `(options, cookie?, requestConfig?)
 * => Result<T>`，同样发 `apiSuccess` / `apiError` 事件，同样复用 amagi 的代理、超时与
 * 重试。
 *
 * 这几个方法都是无状态的：会话状态（含桌面设备标识）全部装在 cookie 串里，调用方拿到
 * 返回的 `cookie` 后在下一次调用时传回来即可。轮询循环由调用方维护。
 *
 * 验证中心本地验证页不移植：服务端下发验证中心 / 图片验证等需要本地交互的场景，
 * 直接归一化为 `status: 'risk'` 失败。
 *
 * @module fetchers/douyin/auth
 */

import type { RequestConfig } from '../../../contracts/request'
import { emitApiError, emitApiSuccess, emitLogDebug } from '../../../model/events'
import { checkQr, Http, pickBiz, prepareQr, randomHex, sendCode, sessionOf, validateCode } from '../../../platforms/douyin/passport'
import type { Challenge, CheckData, QrReady } from '../../../platforms/douyin/passport'
import { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import type { DyPassportPollResult, DyPassportVerifyContext } from '../../../types/ReturnDataType/Douyin'
import { createV6Error, createV6Success, Result } from '../../../validation/legacy'

// 协议原语与归一化规则在 `platforms/douyin/passport`（桌面 IM 链路）——
// 本文件与 `platforms/douyin/session/qrcode.ts` 共用同一份。

/** 扫码成功后的跳转地址（仅 confirmed 分支的 redirectUrl 兜底用） */
const NEXT_URL = 'https://www.douyin.com'

/** 二维码轮询间隔（桌面 check_qrconnect 不返回 interval，统一 2s） */
const POLL_INTERVAL_SEC = 2

/** 验证方式优先级：安全手机短信 > 绑定手机短信 > 上行短信 > 登录密码 */
const WAY_PRIORITY = ['assist_mobile_sms_verify', 'mobile_sms_verify', 'assist_mobile_up_sms_verify', 'pwd_verify'] as const

/** 短信验证码错误的可识别业务码（可重试） */
const WRONG_CODE = [1001, 2001, 3017]

/** 设备标识写入 cookie 的键名（无状态会话靠它恢复桌面设备身份） */
const DEVICE_COOKIE_KEYS = {
  deviceId: 'amd_device_id',
  installId: 'amd_install_id',
  guid: 'amd_guid'
} as const

/** 从 cookie 恢复桌面设备身份（requestPassportQrcode 返回的 cookie 自带） */
const restoreDevice = (http: Http): void => {
  const deviceId = http.jar.get(DEVICE_COOKIE_KEYS.deviceId)
  if (!deviceId) return
  http.setDevice({
    deviceId,
    installId: http.jar.get(DEVICE_COOKIE_KEYS.installId) ?? '0',
    guid: http.jar.get(DEVICE_COOKIE_KEYS.guid) ?? ''
  })
}

/** 取码成功后把设备标识写进 cookie，随会话返回给调用方 */
const persistDevice = (http: Http): void => {
  http.jar.set(DEVICE_COOKIE_KEYS.deviceId, http.deviceId)
  http.jar.set(DEVICE_COOKIE_KEYS.installId, http.installId)
  http.jar.set(DEVICE_COOKIE_KEYS.guid, http.guid)
}

/** DyPassportVerifyContext（轮询归一化）→ 桌面 MFA Challenge（lite 接口入参） */
const challengeOf = (verify: DyPassportVerifyContext): Challenge => ({
  // 轮询时已把 std_verify_* 归一化进 stdParams，可直接充当 biz_params
  encrypt_uid: verify.encryptUid,
  biz_params: verify.stdParams,
  common_params: {}
})

/** 从 verify 上下文选验证方式：优先显式指定，其次按优先级挑能收短信的 */
const resolveVerifyWay = (verify: DyPassportVerifyContext, preferred?: string): string => {
  if (preferred) return preferred
  const chosen = (verify.verifyWays ?? []).find((way) => (WAY_PRIORITY as readonly string[]).includes(way.verifyWay))
  return chosen?.verifyWay ?? ''
}

/** 验证中心 / 图片验证：本地验证页不移植 → 返回 risk 理由 */
const riskReasonOf = (data: CheckData, decision?: string): string | undefined => {
  if (decision) return `验证中心下发二次决策（${decision}），本地验证页未移植`
  const nonEmpty = (value: unknown): boolean => value != null && (typeof value !== 'string' || value !== '')
  if (nonEmpty(data.verify_center_decision_conf)) return '验证中心下发安全验证，本地验证页未移植'
  if (nonEmpty(data.verify_center_secondary_decision_conf)) return '验证中心二次下发安全验证，本地验证页未移植'
  if (data.error_code === 1105) return '需要完成图片验证（error_code=1105），验证页未移植'
  if (typeof data.captcha === 'string' && data.captcha !== '') return '需要完成图片验证（captcha），验证页未移植'
  return undefined
}

/** CheckData → DyPassportVerifyContext（轮询 verify 分支的归一化上下文） */
const verifyCtxOf = (data: CheckData): DyPassportVerifyContext => {
  const common = data.common_params ?? {}
  const str = (source: Record<string, unknown>, key: string, fallback = ''): string => {
    const value = source[key]
    return value == null || value === '' ? fallback : String(value)
  }
  return {
    encryptUid: data.encrypt_uid ?? '',
    verifyTicket: data.verify_ticket ?? '',
    stdParams: pickBiz(data.biz_params),
    copywritingKey: str(common, 'copywriting_key', 'qr_connect'),
    diversionTag: str(common, 'ies_safety_diversion_tag', 'mfa'),
    newVerifyFlow: str(common, 'new_verify_flow'),
    verifyWays: (data.verify_ways ?? [])
      .map((way) => ({ verifyWay: way.verify_way ?? '', mobile: way.mobile }))
      .filter((way) => !!way.verifyWay)
  }
}

/** CheckData → 归一化轮询结果（不含 cookie / logged_in 两字段） */
const pollOf = (data: CheckData, decision?: string): DyPassportPollResult => {
  const riskReason = riskReasonOf(data, decision)
  if (riskReason) return { status: 'risk', interval: POLL_INTERVAL_SEC, message: riskReason }
  if (data.account_flow === 'verify' || (data.verify_ways?.length ?? 0) > 0) {
    return { status: 'verify', interval: POLL_INTERVAL_SEC, verify: verifyCtxOf(data) }
  }
  switch (data.status) {
    case 'new': {
      return { status: 'new', interval: POLL_INTERVAL_SEC }
    }
    case 'scanned': {
      return { status: 'scanned', interval: POLL_INTERVAL_SEC }
    }
    case 'confirmed': {
      return { status: 'confirmed', interval: POLL_INTERVAL_SEC, redirectUrl: data.redirect_url ?? NEXT_URL }
    }
    case 'expired': {
      return { status: 'expired', interval: POLL_INTERVAL_SEC }
    }
    default: {
      return {
        status: 'unknown',
        interval: POLL_INTERVAL_SEC,
        message: data.error_code
          ? (data.description ?? `未知扫码状态 error_code=${data.error_code}`)
          : `未知扫码状态 ${String(data.status)}`
      }
    }
  }
}

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
  verify: DyPassportVerifyContext
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
 * 构造 passport 侧的业务错误响应
 * @param methodType 方法名，进 amagiError.requestType
 * @param message 错误描述
 */
const passportError = (methodType: string, message: string) =>
  createV6Error(
    {
      code: 'UNKNOWN_ERROR',
      data: null,
      amagiError: { errorDescription: message, requestType: methodType, requestUrl: `https://imdesktop.douyin.com/passport/` },
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
 * 申请抖音扫码登录二维码（桌面 IM Passport）
 *
 * 首次调用会自动完成设备注册（device_register 签发桌面 DID）与 ttwid 预热，
 * 无需额外准备；设备标识随返回的 `cookie` 一起走，check 时自动恢复。
 * @deprecated 请用 `client.douyin.login.qrcode()`（会话抽象：
 *   取码 / 轮询 / challenge 由引擎编排，`expire_time` 秒转 `expiresAt` 毫秒）。
 * @param options - 请求选项 (可选)
 * @param cookie - 已有的会话 Cookie (可选，续用同一会话时传入)
 * @param requestConfig - 请求配置 (可选)
 * @returns 二维码令牌、base64 内容与会话 cookie
 * @example
 * ```typescript
 * const qrcode = await requestPassportQrcode()
 * console.log(qrcode.data.content) // base64 图，直接拿去 <img> 渲染
 * ```
 */
export async function requestPassportQrcode(
  options?: undefined,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<DouyinReturnTypeMap['passportQrcode']>> {
  return run('passportQrcode', async () => {
    const http = new Http({ cookie, requestConfig })
    let ready: QrReady
    try {
      ready = await prepareQr(http, { warn: (message) => emitLogDebug(`[douyin passport] ${message}`) })
    } catch (error) {
      return passportError('passportQrcode', error instanceof Error ? error.message : '获取二维码失败')
    }
    // 设备标识写进 cookie，随会话返回，check 时用它恢复桌面身份
    persistDevice(http)
    const nowSec = Math.floor(Date.now() / 1000)
    return createV6Success(
      {
        token: ready.token,
        content: ready.base64,
        expire_time: nowSec + (ready.expireSeconds ?? 0),
        expires_in: ready.expireSeconds ?? 0,
        cookie: http.jar.header()
      },
      '获取成功',
      200
    )
  })
}

/**
 * 查询抖音扫码登录二维码的状态（桌面 IM Passport）
 *
 * 状态为 `confirmed` 时 cookie 已带完整登录态（sessionid / uid_tt 等桌面凭证）。
 * @deprecated 请用 `client.douyin.login.qrcode()`（状态归一化为
 *   `LoginState.phase`，轮询循环在引擎里）。
 * @param options - 二维码状态参数
 * @param options.token - `requestPassportQrcode` 返回的令牌
 * @param cookie - 会话 Cookie，必须是申请二维码时返回的那一份
 * @param requestConfig - 请求配置 (可选)
 * @returns 扫码状态与最新会话 cookie
 * @example
 * ```typescript
 * const status = await checkPassportQrcode({ token }, cookie)
 * // new 未扫码 / scanned 已扫待确认 / verify 需二次验证 / confirmed 登录成功 / expired 已过期 / risk 触发风控
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

    const http = new Http({ cookie, requestConfig })
    restoreDevice(http)

    let data: CheckData
    let decision: string | undefined
    try {
      const result = await checkQr(http, options.token)
      data = result.data
      decision = result.decision
    } catch (error) {
      return passportError('passportQrcodeStatus', error instanceof Error ? error.message : '查询二维码状态失败')
    }

    const poll = pollOf(data, decision)
    let sessionCookie = http.jar.header()
    let loggedIn = false
    if (poll.status === 'confirmed') {
      try {
        sessionCookie = sessionOf(http, data.user_data).cookie
        loggedIn = true
      } catch {
        // user_data 缺 user_id：退回当前 cookie，不阻断返回
      }
    }
    return createV6Success({ ...poll, cookie: sessionCookie, logged_in: loggedIn }, '获取成功', 200)
  })
}

/**
 * 向账号绑定手机发送二次验证短信验证码（桌面 IM Passport）
 *
 * 用于轮询返回 `status: 'verify'`（`account_flow=verify`）的场景。
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

    const verifyWay = resolveVerifyWay(options.verify, options.verify_way)
    if (!verifyWay || verifyWay === 'assist_mobile_up_sms_verify' || verifyWay === 'pwd_verify') {
      return passportError('passportSendCode', `验证方式 ${verifyWay || '未知'} 需要本地交互，未移植`)
    }
    emitLogDebug(`[douyin passport] 发码使用的验证方式: ${verifyWay}`)

    const http = new Http({ cookie, requestConfig })
    restoreDevice(http)

    let result: Awaited<ReturnType<typeof sendCode>>
    try {
      result = await sendCode(http, challengeOf(options.verify), verifyWay)
    } catch (error) {
      return passportError('passportSendCode', error instanceof Error ? error.message : '发送验证码失败')
    }
    const data = result.data ?? {}
    const errorCode = data.error_code
    const ok = errorCode == null || errorCode === 0
    if (!ok) emitLogDebug(`[douyin passport] 发码失败原文: ${JSON.stringify(data).slice(0, 500)}`)
    return createV6Success(
      {
        ok,
        mobile: data.mobile == null ? '' : String(data.mobile),
        retryAfter: ok ? 60 : 0,
        errorCode,
        message: data.description ?? (ok ? '发送成功' : '发送验证码失败'),
        cookie: http.jar.header(),
        biz_trace_id: options.biz_trace_id ?? randomHex(8),
        verify_way: verifyWay
      },
      '获取成功',
      200
    )
  })
}

/**
 * 提交二次验证的短信验证码（桌面 IM Passport）
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

    const verifyWay = resolveVerifyWay(options.verify, options.verify_way)
    if (!verifyWay || verifyWay === 'assist_mobile_up_sms_verify' || verifyWay === 'pwd_verify') {
      return passportError('passportValidateCode', `验证方式 ${verifyWay || '未知'} 需要本地交互，未移植`)
    }

    const http = new Http({ cookie, requestConfig })
    restoreDevice(http)

    let result: Awaited<ReturnType<typeof validateCode>>
    try {
      result = await validateCode(http, challengeOf(options.verify), verifyWay, options.code)
    } catch (error) {
      return passportError('passportValidateCode', error instanceof Error ? error.message : '提交验证码失败')
    }
    const data = result.data ?? {}
    const errorCode = data.error_code
    const ok = errorCode == null || errorCode === 0
    const wrongCode = ok ? false : WRONG_CODE.includes(Number(errorCode))
    if (!ok) emitLogDebug(`[douyin passport] 验码失败原文: ${JSON.stringify(data).slice(0, 500)}`)
    return createV6Success(
      {
        ok,
        wrongCode,
        errorCode,
        message: data.description ?? (ok ? '验证通过' : '验证失败'),
        cookie: http.jar.header()
      },
      '获取成功',
      200
    )
  })
}
