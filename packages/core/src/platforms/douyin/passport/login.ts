import { verifyDecision, type Http } from './client'
import { im } from './const'
import { createDevice, type Device } from './device'
import { form, type MfaRes } from './lite'
/**
 * 扫码登录原语：设备预热 → 取码 → 轮询 → 二次验证（MFA）→ 会话。
 * 轮询节奏与状态机由策略层（session/qrcode）编排；验证中心本地页不在此移植。
 */
import { browserInfo, encodeBrowserInfo } from './sign/browser'
import { mixEncode } from './sign/mix'
import { desktopBaseQuery, desktopUrl, encodeForm, signQuery, type SignExtras } from './sign/qs'

export const QR_BODY = {
  need_logo: 'false',
  need_short_url: 'false',
  is_frontier: 'true',
  is_new_login: '1',
  next: 'https://www.douyin.com'
} as const

export type QrStatus = 'new' | 'scanned' | 'confirmed' | 'expired' | (string & {})

export interface QrUserData {
  app_id?: number
  user_id?: number
  user_id_str?: string
  sec_user_id?: string
  screen_name?: string
  name?: string
  avatar_url?: string
  mobile?: string
  has_password?: number
  country_code?: number
  [key: string]: unknown
}

/** 服务端可选的二次验证方式（assist_ 前缀 = 安全手机） */
export interface VerifyWay {
  verify_way?: string
  mobile?: string
  sms_content?: string
  channel_mobile?: string
  [key: string]: unknown
}

export interface CheckData {
  status?: QrStatus
  error_code: number
  account_flow?: string
  encrypt_uid?: string
  biz_params?: Record<string, unknown>
  common_params?: Record<string, unknown>
  verify_ways?: VerifyWay[]
  /** 验证中心决策 conf（JSON 串或对象）：需在本地验证页完成官方安全验证后重试 */
  verify_center_decision_conf?: string | Record<string, unknown>
  /** 验证中心二次决策 conf：一次验证通过后服务端可能再次下发 */
  verify_center_secondary_decision_conf?: string | Record<string, unknown>
  verify_ticket?: string
  captcha?: string
  description?: string
  desc_url?: string
  extra?: string
  redirect_url?: string
  scan_app_id?: number
  user_data?: QrUserData
  scan_user_info?: Record<string, unknown>
  scan_device_info?: Record<string, unknown>
}

interface Envelope<T> {
  message: string
  data: T
}

export interface GetQrData {
  token: string
  qrcode: string
  expire_time: number
  error_code: number
  qrcode_index_url?: string
  description?: string
}

/** MFA 挑战参数 */
export interface Challenge {
  encrypt_uid?: string
  biz_params?: Record<string, unknown>
  common_params?: Record<string, unknown>
}

export interface DesktopSession {
  userId: string
  cookie: string
  userData?: QrUserData
}

/** 登录启动辅助：设备注册 + ttwid 预热 + 取码；失败时只抛取码错误 */
export interface QrReady {
  device: Device
  token: string
  base64: string
  indexUrl?: string
  /** 二维码剩余有效秒数（服务端 expire_time 换算，缺省由策略兜底） */
  expireSeconds?: number
}

/** 服务端签发的设备身份是登录不触发短信二次验证的根因 */
export async function prepareQr(http: Http, log?: { warn: (message: string) => void }): Promise<QrReady> {
  const device = await createDevice(log)
  http.setDevice(device)
  await ttwid(http).catch(() => undefined)
  const qr = await getQr(http)
  return { device, token: qr.token, base64: qr.base64, indexUrl: qr.qrcodeIndexUrl, expireSeconds: qr.expireSeconds }
}

export { verifyDecision }

/** 桌面端 ttwid 预热（失败不阻断登录） */
export async function ttwid(http: Http): Promise<void> {
  await http.json(`${im.origin}/ttwid/check/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      aid: Number(im.aid),
      service: 'imdesktop.douyin.com',
      unionHost: 'https://ttwid.bytedance.com',
      host: 'https://imdesktop.douyin.com',
      union: false,
      needFid: false,
      fid: '',
      migrate_priority: 0
    })
  })
}

/** account_sdk_source_info：优先 Cookie，缺失时以 browserInfo 模板编码并回写 */
function sdkSourceInfo(http: Http): string {
  const stored = http.jar.get('sdk_source_info')
  if (stored) return stored
  const info = encodeBrowserInfo(browserInfo())
  http.jar.set('sdk_source_info', info)
  return info
}

function signExtras(http: Http, bodyWire = ''): SignExtras {
  const extras: SignExtras = {
    userAgent: http.ua,
    appKey: im.appKey,
    bodyWire
  }
  const msToken = http.jar.get('msToken')
  if (msToken) extras.msToken = msToken
  return extras
}

/** GET /passport/web/get_qrcode/，返回二维码 token 与 base64 图片 */
export async function getQr(http: Http): Promise<{ token: string; base64: string; qrcodeIndexUrl?: string; expireSeconds?: number }> {
  const query = desktopBaseQuery({
    deviceId: http.deviceId,
    installId: http.installId,
    accountSdkSourceInfo: sdkSourceInfo(http),
    bizTraceId: http.bizTraceId,
    next: QR_BODY.next,
    extra: { need_logo: 'false', need_short_url: 'true' }
  })
  const { search } = signQuery(query, {}, signExtras(http))
  const url = desktopUrl('/passport/web/get_qrcode/', search)
  const res = await http.json<Envelope<GetQrData>>(url, { headers: http.passportHeaders(url) })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`get_qrcode failed: HTTP ${res.status} ${res.raw.slice(0, 200)}`)
  }
  const d = res.body.data
  if (d.error_code !== 0 || !d.qrcode) {
    throw new Error(`get_qrcode error_code=${d.error_code} ${d.description ?? ''}`)
  }
  // expire_time 是绝对 Unix 秒；换算剩余秒并夹在可信区间，服务端没给时返回 undefined
  const expireSeconds =
    typeof d.expire_time === 'number' && d.expire_time > 0
      ? Math.min(300, Math.max(5, d.expire_time - Math.floor(Date.now() / 1000)))
      : undefined
  return { token: d.token, base64: d.qrcode, qrcodeIndexUrl: d.qrcode_index_url, expireSeconds }
}

/** POST /passport/web/check_qrconnect/，返回当前扫码状态；fp 用于安全验证后回填 */
export async function checkQr(
  http: Http,
  token: string,
  bodyOverrides?: Record<string, string>,
  fp?: string
): Promise<{ data: CheckData; decision?: string }> {
  const body: Record<string, string> = { ...QR_BODY, token, ...bodyOverrides }
  const query = desktopBaseQuery({
    deviceId: http.deviceId,
    installId: http.installId,
    accountSdkSourceInfo: sdkSourceInfo(http),
    bizTraceId: http.bizTraceId,
    extra: fp ? { fp } : undefined
  })
  const bodyWire = encodeForm(body)
  const { search } = signQuery(query, body, signExtras(http, bodyWire))
  const url = desktopUrl('/passport/web/check_qrconnect/', search)
  const res = await http.json<Envelope<CheckData>>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...http.passportHeaders(url) },
    data: bodyWire
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`check_qrconnect failed: HTTP ${res.status} ${res.raw.slice(0, 200)}`)
  }
  return { data: res.body.data, decision: verifyDecision(res.headers) }
}

/** 验证方式优先级：安全手机短信 > 绑定手机短信 > 上行短信（用安全手机发短信）> 登录密码 */
export const WAY_PRIORITY = ['assist_mobile_sms_verify', 'mobile_sms_verify', 'assist_mobile_up_sms_verify', 'pwd_verify'] as const

export function selectWay(data: CheckData): VerifyWay | undefined {
  const ways = data.verify_ways ?? []
  return WAY_PRIORITY.map((name) => ways.find((way) => way.verify_way === name)).find(Boolean)
}

export function sendCode(http: Http, challenge: Challenge, verifyWay: string): Promise<MfaRes> {
  return form(http, '/passport/web/send_code/', mfaBody(challenge, verifyWay, { is6Digits: '1' }))
}

export function validateCode(http: Http, challenge: Challenge, verifyWay: string, code?: string): Promise<MfaRes> {
  // 3737 桌面场景用 mixEncode，363c web 场景用 xorHex
  const encoded = code == null ? undefined : verifyWay === 'mobile_sms_verify' ? mixEncode(code) : xorHex(code)
  return form(http, '/passport/web/validate_code/', mfaBody(challenge, verifyWay, encoded != null ? { code: encoded } : {}))
}

/**
 * 登录密码二次验证（pwd_verify，逆向自 second-verification-web.js）：
 * POST /passport/web/account/verify/，password 字段 xorHex（Xor5+hex）编码 + mix_mode=1，
 * 无 type/send_code 步骤，成功返回 data.ticket。
 */
export function validatePassword(http: Http, challenge: Challenge, password: string): Promise<MfaRes> {
  return form(http, '/passport/web/account/verify/', mfaBody(challenge, 'pwd_verify', { password: xorHex(password) }))
}

/** code_encrypt：UTF-8 每字节 ^5 后的两位 hex（363c 场景配套） */
function xorHex(s: string): string {
  const hex = '0123456789abcdef'
  let out = ''
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    const bytes =
      c <= 0x7f
        ? [c]
        : c <= 0x7ff
          ? [0xc0 | ((c >> 6) & 0x1f), 0x80 | (c & 0x3f)]
          : c <= 0xffff
            ? [0xe0 | ((c >> 12) & 0x0f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)]
            : []
    for (const b of bytes) out += hex[(b ^ 5) >> 4] + hex[(b ^ 5) & 15]
  }
  return out
}

function mfaBody(challenge: Challenge, verifyWay: string, extra: Record<string, string>): Record<string, string> {
  const biz = challenge.biz_params ?? {}
  const common = challenge.common_params ?? {}
  const value = (source: Record<string, unknown>, key: string, fallback = ''): string => {
    const candidate = source[key]
    return candidate == null || candidate === '' ? fallback : String(candidate)
  }
  return {
    mix_mode: '1',
    // 绑定手机短信走桌面场景 3737；辅助手机/上行短信走 web 场景 363c；密码验证无 type 字段
    ...(verifyWay === 'pwd_verify' ? {} : { type: verifyWay === 'mobile_sms_verify' ? '3737' : '363c' }),
    encrypt_uid: challenge.encrypt_uid ?? '',
    verify_ticket: '',
    copywriting_key: value(common, 'copywriting_key', 'qr_connect'),
    ies_safety_diversion_tag: value(common, 'ies_safety_diversion_tag', 'mfa'),
    new_verify_flow: value(common, 'new_verify_flow'),
    std_verify_flow_id: value(biz, 'std_verify_flow_id', value(common, 'std_verify_flow_id')),
    std_verify_scene: value(biz, 'std_verify_scene', 'account_login'),
    std_verify_template: value(biz, 'std_verify_template', 'ato'),
    std_verify_token: value(biz, 'std_verify_token', value(common, 'std_verify_token')),
    std_verify_type: value(biz, 'std_verify_type', 'MFA'),
    std_verify_way: verifyWay,
    ...extra,
    aid: im.aid,
    new_authn_sdk_version: '1.0.0.421-web'
  }
}

const BIZ_KEYS = [
  'passport_mfa_retry_tag',
  'std_verify_flow_id',
  'std_verify_scene',
  'std_verify_template',
  'std_verify_token',
  'std_verify_type',
  'std_verify_way'
] as const

/** MFA 校验通过后，轮询 check_qrconnect 需要携带的 biz 参数 */
export function pickBiz(params?: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  if (!params) return result
  for (const key of BIZ_KEYS) {
    const value = params[key]
    if (value != null) result[key] = String(value)
  }
  return result
}

export function sessionOf(http: Http, userData?: QrUserData): DesktopSession {
  // 新版 uid_tt cookie 已是 hash 形态；frontier device_id / 消息过滤需要数字 uid
  const userId = userData?.user_id_str ?? (userData?.user_id != null ? String(userData.user_id) : undefined) ?? http.jar.get('uid_tt')
  if (!userId) throw new Error('confirmed but no userId (uid_tt cookie or user_data.user_id_str)')
  const session: DesktopSession = { userId, cookie: http.jar.header() }
  if (userData) session.userData = userData
  return session
}
