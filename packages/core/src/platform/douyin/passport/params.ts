/**
 * passport 登录 SDK 的参数与签名构造
 *
 * login.douyin.com 的接口一共要过四道签名：
 * - `p_no`：SDK 版本相关参数排序后取 sha256
 * - `sign`：`排序后的前 10 个 query 参数 & 排序后的 body 参数 & app_key` 取 sha256
 * - `qs`：参与 sign 的参数名列表逐字节异或 5 后转十六进制
 * - `x-tt-passport-aid-sign` 请求头：以 appKey 为消息、当日 UTC 正午时间戳为密钥做 HMAC 派生
 *
 * 这些常量都是 SDK 自身的版本号与固定 app_key，属于协议的一部分，不含任何设备/账号信息。
 */
import crypto from 'node:crypto'

import { BDMS_SDK_VERSION } from './aBogus'

/** passport 登录 SDK 的 app_key */
const APP_KEY = '163e7ce78d58971a41f5b969996d85c2'

/** 抖音 web 的 aid */
export const PASSPORT_AID = '6383'

/** 登录接口域名 */
export const LOGIN_HOST = 'login.douyin.com'

/** 抖音主站域名 */
export const WEB_HOST = 'www.douyin.com'

/** 登录 SDK（normal 形态）版本号 */
const JSSDK_VERSION = '3.1.3'

/** 验证页 SDK（lite 形态）版本号 */
export const LITE_JSSDK_VERSION = '5.1.2'

/** 验证页使用的 authn SDK 版本号 */
export const LITE_AUTHN_VERSION = '1.0.0.420-web'

/** 各子 SDK 版本号，参与 p_no 计算 */
const SDK_VERSIONS = {
  pVer: '1.1.3',
  pZt: '3.3.14',
  pUi: '2.1.9-alpha.6',
  pCa: '4.0.17',
  pCaReal: '1.0.0.874'
}

/** 与 aBogus 中 BROWSER_ENV 对应的窗口尺寸，用于生成 account_sdk_source_info */
const ENV_VIEWPORT = { innerWidth: 2048, innerHeight: 960, outerWidth: 2554, outerHeight: 1386 }

const sha256Hex = (input: string): string => crypto.createHash('sha256').update(input, 'utf8').digest('hex')

const hmacSha256 = (key: Uint8Array, message: Uint8Array): Buffer =>
  crypto.createHmac('sha256', Buffer.from(key)).update(Buffer.from(message)).digest()

const hexToBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [])

/**
 * 逐字节异或 5 后转十六进制，SDK 用它编码参数名列表、验证码与密码
 * @param input 明文
 */
export const xor5Hex = (input: string): string =>
  Array.from(Buffer.from(input, 'utf8'), (byte) => (byte ^ 5).toString(16).padStart(2, '0')).join('')

/** 随机十六进制串，用于 biz_trace_id 一类的追踪 ID */
export const randomHex = (length: number): string =>
  crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)

/** 随机 UUID v4 */
export const uuid = (): string => crypto.randomUUID()

/** 当日 UTC 12:00 的秒级时间戳，aid-sign 以此为密钥基准 */
export const utcNoonTimestamp = (now = new Date()): number =>
  Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0) / 1000)

/**
 * 按 SDK 规则序列化参数：键名排序后拼成 `k=v&k=v`
 * @param params 参数对象
 * @param limit 大于等于 0 时只取排序后的前 limit 个键
 */
const serializeSorted = (params: Record<string, unknown>, limit = -1): { text: string; keys: string[] } => {
  const keys = Object.keys(params).sort()
  if (limit >= 0) keys.splice(limit)
  return {
    text: keys.map((key) => `${key}=${typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]}`).join('&'),
    keys
  }
}

/**
 * 计算 sign 与 qs
 * @param params query 参数（仅排序后的前 10 个参与签名）
 * @param data body 参数，GET 请求传空对象
 */
export const makeSignAndQs = (params: Record<string, unknown>, data: Record<string, unknown> = {}): { sign: string; qs: string } => {
  const { text: paramsText, keys } = serializeSorted(params, 10)
  const { text: dataText } = serializeSorted(data)
  return {
    sign: sha256Hex(`${paramsText}&${dataText}&app_key=${APP_KEY}`),
    qs: xor5Hex(keys.join(','))
  }
}

/**
 * 计算 p_no
 * @param pTs 毫秒时间戳，与 query 里的 p_ts 保持一致
 */
const makePNo = (pTs: string): string => {
  const parts: Record<string, string> = {
    passport_jssdk_version: JSSDK_VERSION,
    p_bd: BDMS_SDK_VERSION,
    p_ca: SDK_VERSIONS.pCa,
    p_ts: pTs,
    p_ver: SDK_VERSIONS.pVer,
    p_zt: SDK_VERSIONS.pZt
  }
  return sha256Hex(
    Object.keys(parts)
      .sort()
      .map((key) => `${key}=${parts[key]}`)
      .join('&')
  )
}

/**
 * HKDF 风格的密钥派生，aid-sign 内部使用
 * @param keyHex 初始密钥（十六进制）
 * @param length 输出长度
 */
const deriveKey = (keyHex: string, length: number): Uint8Array => {
  const output: number[] = []
  let previous = ''
  let counter = 0
  while (output.length < length) {
    counter++
    const message = Uint8Array.from([...hexToBytes(previous), counter])
    previous = hmacSha256(hexToBytes(keyHex), message).toString('hex')
    output.push(...hexToBytes(previous))
  }
  return Uint8Array.from(output.slice(0, length))
}

/**
 * 计算 `x-tt-passport-aid-sign` 请求头
 * @param urlPath 接口路径，如 `/passport/web/get_qrcode/`
 * @param timestamp 当日 UTC 正午时间戳（秒），默认取当前
 */
export const makeAidSign = (urlPath: string, timestamp = utcNoonTimestamp()): string => {
  const encoder = new TextEncoder()
  const ts = String(timestamp)
  const seed = hmacSha256(encoder.encode(ts), encoder.encode(APP_KEY)).toString('hex')
  const key = deriveKey(seed, 32)
  return hmacSha256(key, encoder.encode(`aid=${PASSPORT_AID}&path=${urlPath}&ts=${ts}`)).toString('hex')
}

/**
 * 生成 account_sdk_source_info：SDK 采集的浏览器环境快照，异或 5 后转十六进制。
 *
 * 上游参考实现内联的是作者本机抓包值（含显卡型号、堆内存占用、带 query 的个人主页 URL），
 * 不适合进仓库，这里换成一份等价形态的通用快照。
 *
 * 实测服务端在 `get_qrcode` 阶段不校验该字段内容（删掉、置空、填垃圾值都同样返回
 * `error_code: 0`），保留它只是为了与 SDK 的真实请求形态一致。
 */
export const makeAccountSdkSourceInfo = (): string =>
  xor5Hex(
    JSON.stringify({
      hardwareConcurrency: 8,
      webdriver: false,
      chromedriver: false,
      shelldriver: false,
      plugins: 5,
      innerHeight: ENV_VIEWPORT.innerHeight,
      innerWidth: ENV_VIEWPORT.innerWidth,
      outerHeight: ENV_VIEWPORT.outerHeight,
      outerWidth: ENV_VIEWPORT.outerWidth,
      webgl: {
        vendor: 'Google Inc. (Intel)',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
      },
      performance: {
        timeOrigin: Date.now(),
        navigationTiming: {
          entryType: 'navigation',
          initiatorType: 'navigation',
          name: `https://${WEB_HOST}/`,
          renderBlockingStatus: 'non-blocking'
        }
      },
      browser: { bit_protocol: 'false', bit_helper: false }
    })
  )

/**
 * 构造 passport 登录 SDK 的通用 query 参数
 *
 * 参数顺序即实际发送顺序：SDK 各拦截器依次注入，`request_host` 在这里先编码一次，
 * 拼 URL 时会再编码一次，所以线上抓包看到的是双重编码。
 * @param extra 业务参数（GET 时并入 query）
 */
export const makeCommonParams = (extra: Record<string, string | number> = {}): Record<string, string> => {
  const pTs = String(Date.now())
  const params: Record<string, string> = {
    passport_jssdk_version: JSSDK_VERSION,
    passport_jssdk_type: 'normal',
    is_from_ttaccountsdk: '1',
    aid: PASSPORT_AID,
    language: 'zh',
    account_app_language: 'zh-CN',
    ts: String(utcNoonTimestamp()),
    ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, String(value)])),
    is_from_iesaccountsaas: '1',
    p_ui: SDK_VERSIONS.pUi,
    p_ca: SDK_VERSIONS.pCa,
    p_ca_real: SDK_VERSIONS.pCaReal,
    account_sdk_source: 'web',
    account_sdk_source_info: makeAccountSdkSourceInfo(),
    p_js_v: JSSDK_VERSION,
    p_js_t: 'pro',
    p_zt: SDK_VERSIONS.pZt,
    p_ver: SDK_VERSIONS.pVer,
    p_ver_real: '0',
    request_host: encodeURIComponent(`https://${WEB_HOST}`),
    p_bd: BDMS_SDK_VERSION,
    p_ts: pTs,
    p_no: makePNo(pTs),
    biz_trace_id: randomHex(8),
    device_platform: 'web_app'
  }
  return params
}

/**
 * 构造验证页 SDK（lite 形态）的固定 query 参数
 * @param bizTraceId 业务追踪 ID
 */
export const makeLiteParams = (bizTraceId: string): Record<string, string> => ({
  passport_jssdk_version: LITE_JSSDK_VERSION,
  passport_jssdk_type: 'lite',
  is_from_ttaccountsdk: '1',
  aid: PASSPORT_AID,
  language: 'zh',
  account_app_language: 'zh-CN',
  new_authn_sdk_version: LITE_AUTHN_VERSION,
  biz_trace_id: bizTraceId
})

/**
 * 按插入顺序序列化为查询串（不排序，`request_host` 因此产生二次编码）
 * @param params 参数对象
 */
export const serializeQuery = (params: Record<string, string | number>): string =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&')
