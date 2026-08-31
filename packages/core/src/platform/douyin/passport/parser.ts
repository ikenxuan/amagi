/**
 * 服务端响应的解析
 *
 * 全部是纯函数，不碰网络，登录状态机的分支判断都收敛在这里，方便离线单测。
 */
import type { PassportPayload } from './client'
import type { PollResult, QrcodeInfo, SendCodeResult, ValidateCodeResult, VerifyContext, VerifyWay } from './types'

/** 触发账号二次验证的错误码 */
const ERROR_SECOND_VERIFY = 2046

/** 验证码错误 */
const ERROR_WRONG_CODE = 1202

/** 发码过于频繁 */
const ERROR_RATE_LIMITED = 1206

/** 命中风控 / 设备环境异常 */
const RISK_ERROR_CODES = new Set([2156, 4031])

/** 轮询间隔下限与默认值，服务端偶尔会给 0 */
const MIN_INTERVAL = 1000
const DEFAULT_INTERVAL = 3000

/** 验证会话票据字段，需原样透传 */
const STD_KEYS = [
  'std_verify_flow_id',
  'std_verify_scene',
  'std_verify_template',
  'std_verify_token',
  'std_verify_type',
  'std_verify_way'
] as const

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

const asNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** 从响应体的多个可能位置取错误码 */
const readErrorCode = (payload: PassportPayload): number | undefined => asNumber(payload.data?.error_code) ?? asNumber(payload.error_code)

/** 取一段人类可读的错误描述 */
const readMessage = (payload: PassportPayload): string =>
  asString(payload.data?.description) || asString(payload.description) || asString(payload.message) || ''

/**
 * 解析 `get_qrcode` 响应
 * @param payload 服务端响应体
 * @returns 二维码信息，缺少 token 时返回 null
 */
export const parseQrcode = (payload: PassportPayload): QrcodeInfo | null => {
  const data = payload.data ?? {}
  const token = asString(data.token)
  if (!token) return null

  return {
    token,
    content: asString(data.qrcode_index_url) || token,
    expireTime: asNumber(data.expire_time) ?? 0
  }
}

/** 解析服务端下发的可选验证方式 */
const parseVerifyWays = (raw: unknown): VerifyWay[] => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      const way = item as Record<string, unknown>
      return { verifyWay: asString(way?.verify_way), mobile: asString(way?.mobile) || undefined }
    })
    .filter((way) => way.verifyWay !== '')
}

/**
 * 从轮询响应里提取二次验证上下文
 * @param data 轮询响应的 data 段
 */
const parseVerifyContext = (data: Record<string, unknown>): VerifyContext => {
  const stdParams: Record<string, string> = {}
  for (const key of STD_KEYS) {
    const value = asString(data[key])
    if (value) stdParams[key] = value
  }

  return {
    encryptUid: asString(data.encrypt_uid),
    verifyTicket: asString(data.verify_ticket),
    stdParams,
    copywritingKey: asString(data.copywriting_key) || 'qr_connect',
    diversionTag: asString(data.ies_safety_diversion_tag) || 'mfa',
    newVerifyFlow: asString(data.new_verify_flow),
    verifyWays: parseVerifyWays(data.verify_ways)
  }
}

/**
 * 解析 `check_qrconnect` 响应为状态机可消费的结果
 * @param payload 服务端响应体
 */
export const parsePollResult = (payload: PassportPayload): PollResult => {
  const data = payload.data ?? {}
  const rawInterval = asNumber(data.interval) ?? 0
  const interval = rawInterval >= MIN_INTERVAL ? rawInterval : DEFAULT_INTERVAL
  const status = asString(data.status)
  const errorCode = readErrorCode(payload)

  // 二次验证：可能带 status，也可能只有 error_code 2046 / account_flow=verify
  if (errorCode === ERROR_SECOND_VERIFY || asString(data.account_flow) === 'verify') {
    return { status: 'verify', interval, verify: parseVerifyContext(data) }
  }

  if (errorCode !== undefined && RISK_ERROR_CODES.has(errorCode)) {
    return { status: 'risk', interval, message: readMessage(payload) || `error_code=${errorCode}` }
  }

  switch (status) {
    case 'new':
    case 'scanned':
    case 'expired':
      return { status, interval }
    case 'confirmed':
      return {
        status: 'confirmed',
        interval,
        redirectUrl: asString(data.redirect_url) || (Array.isArray(data.redirect_urls) ? asString(data.redirect_urls[0]) : '')
      }
    default:
      return {
        status: 'unknown',
        interval,
        message: readMessage(payload) || (status ? `status=${status}` : `error_code=${errorCode ?? 'unknown'}`)
      }
  }
}

/**
 * 解析 `send_code` 响应
 * @param payload 服务端响应体
 */
export const parseSendCodeResult = (payload: PassportPayload): SendCodeResult => {
  const data = payload.data ?? {}
  const errorCode = readErrorCode(payload)
  const retryAfter = asNumber(data.retry_time) ?? 60
  const mobile = asString(data.mobile)

  // 只认显式的成功信号：空响应或结构异常一律视为失败，避免把风控页当成发码成功
  if (errorCode === 0 || (errorCode === undefined && payload.message === 'success')) {
    return { ok: true, mobile, retryAfter, message: '' }
  }

  return {
    ok: false,
    mobile,
    retryAfter,
    errorCode,
    message:
      readMessage(payload) || (errorCode === ERROR_RATE_LIMITED ? '短信发送过于频繁' : `发码失败 error_code=${errorCode ?? 'unknown'}`)
  }
}

/**
 * 解析 `validate_code` 响应
 * @param payload 服务端响应体
 */
export const parseValidateCodeResult = (payload: PassportPayload): ValidateCodeResult => {
  const data = payload.data ?? {}
  const errorCode = readErrorCode(payload)

  if (errorCode === 0 || asString(data.ticket) || (errorCode === undefined && payload.message === 'success')) {
    return { ok: true, wrongCode: false, message: '' }
  }

  return {
    ok: false,
    wrongCode: errorCode === ERROR_WRONG_CODE,
    errorCode,
    message: readMessage(payload) || (errorCode === ERROR_WRONG_CODE ? '验证码错误' : `验证失败 error_code=${errorCode ?? 'unknown'}`)
  }
}
