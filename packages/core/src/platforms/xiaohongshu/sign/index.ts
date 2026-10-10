/**
 * 小红书签名算法。
 *
 * 包装 `@ikenxuan/xhshow-ts` 的 `Xhshow` 实例，提供 GET / POST / X-S-Common /
 * X-T / X-B3-Traceid / X-Xray-Traceid / X-Rap-Param / 搜索 ID / 搜索 request_id
 * 的生成函数。a1 从 cookie 取值的逻辑用 `contracts/cookie.ts` 的 `getCookieValue`。
 *
 * `Xhshow` 实例是模块级单例，行为与性能无额外开销。
 *
 * xhshow-ts 新增的几样参数由这里落地：
 * - **XYW_ 格式**（`generateXSGetXyw` / `generateXSPostXyw`）：显式可选的 AES-128-CBC
 *   签名，当前没有注册端点使用。独立载荷验证不等于完整请求验证，浏览器对照见 steps.ts。
 *   签名把毫秒时间戳写进密文的 `x4`；调用方应传 `timestampMs`，使其与 `x-t` 一致。
 * - **x-rap-param**（`generateXRapParam`）：feed / 搜索 / 发布类接口的额外校验头。
 * - **x-xray-traceid**（`generateXrayTraceid`）：追踪头，随现代浏览器每次请求下发。
 * - **search request_id**（`getSearchRequestId`）：搜索接口所需的 `{random}-{ts_ms}`。
 */
import { randomUUID } from 'node:crypto'

import { type SessionManager, Xhshow, xRapParam } from '@ikenxuan/xhshow-ts'

import { getCookieValue } from '../../../contracts/cookie'
import { createXiaohongshuCryptoConfig } from './config'

export { createXiaohongshuGuestCookie, createXiaohongshuGuestSession } from './guestCookie'

/** 模块级 Xhshow 单例 */
const cryptoConfig = createXiaohongshuCryptoConfig()
const client = new Xhshow(cryptoConfig)

/**
 * 毫秒时间戳 → xhshow-ts 的 `signXyw` / `xRapParam` 要的秒时间戳。
 *
 * xhshow-ts 内部统一 `Math.floor(timestamp * 1000)` 还原成毫秒，所以这里除以 1000 后
 * 不能取整，否则毫秒精度丢失、签名里的 `x4` 对不上调用方发出的 `x-t`。
 */
const toSignTimestamp = (timestampMs?: number): number | undefined => (timestampMs === undefined ? undefined : timestampMs / 1000)

/**
 * 生成 GET 请求的 X-S 签名。
 * @param path - API 路径，如 `/api/sns/web/v1/feed`
 * @param a1Cookie - a1 cookie 值
 * @param clientType - 客户端类型，默认 `'xhs-pc-web'`
 * @param params - 查询参数对象
 * @returns X-S 签名
 */
export const generateXSGet = (
  path: string,
  a1Cookie: string,
  clientType: string = 'xhs-pc-web',
  params: Record<string, unknown> = {},
  session?: SessionManager
): string => client.signXsGet(path, a1Cookie, clientType, params, undefined, session)

/**
 * 生成 POST 请求的 X-S 签名。
 * @param path - API 路径
 * @param a1Cookie - a1 cookie 值
 * @param clientType - 客户端类型，默认 `'xhs-pc-web'`
 * @param body - 请求体对象
 * @returns X-S 签名
 */
export const generateXSPost = (
  path: string,
  a1Cookie: string,
  clientType: string = 'xhs-pc-web',
  body: Record<string, unknown> = {},
  session?: SessionManager
): string => client.signXsPost(path, a1Cookie, clientType, body, undefined, session)

/**
 * 生成 GET 请求的 XYW_ 格式 X-S 签名（AES-128-CBC）。
 *
 * 返回值以 `XYW_` 开头，走独立于 `signXsGet` 的加密路径。
 * 供需要 XYW 协议的调用方显式选用，注册端点不因此自动更换签名。
 * @param path - API 路径，如 `/api/sns/web/v1/user_posted`
 * @param a1Cookie - a1 cookie 值
 * @param clientType - 客户端类型，默认 `'xhs-pc-web'`
 * @param params - 查询参数对象
 * @param timestampMs - 毫秒时间戳，省略则取当前时间。签名把它写进密文的 `x4` 字段，
 *   而 `x-t` 请求头必须是同一个值（真机 `window._webmsxyw` 返回的 `X-t` 即其所签的
 *   `x4`），所以调用方要对齐两者时必须显式传入。
 * @returns XYW_ 格式 X-S 签名
 */
export const generateXSGetXyw = (
  path: string,
  a1Cookie: string,
  clientType: string = 'xhs-pc-web',
  params: Record<string, unknown> = {},
  timestampMs?: number
): string => client.signXyw('GET', path, a1Cookie, clientType, params, toSignTimestamp(timestampMs))

/**
 * 生成 POST 请求的 XYW_ 格式 X-S 签名（AES-128-CBC）。
 * @param path - API 路径
 * @param a1Cookie - a1 cookie 值
 * @param clientType - 客户端类型，默认 `'xhs-pc-web'`
 * @param body - 请求体对象
 * @param timestampMs - 毫秒时间戳，省略则取当前时间。与 `x-t` 必须一致，见
 *   {@link generateXSGetXyw}。
 * @returns XYW_ 格式 X-S 签名
 */
export const generateXSPostXyw = (
  path: string,
  a1Cookie: string,
  clientType: string = 'xhs-pc-web',
  body: Record<string, unknown> = {},
  timestampMs?: number
): string => client.signXyw('POST', path, a1Cookie, clientType, body, toSignTimestamp(timestampMs))

/**
 * 生成 X-Rap-Param 请求头（feed / 搜索 / 发布类接口的额外校验）。
 * @param api - 请求 API，形如 `//edith.xiaohongshu.com/api/sns/web/v1/feed`（含 host、去协议）
 * @param body - POST 请求体或 GET 查询参数对象
 * @returns Base64 编码的 x-rap-param 字符串
 */
export const generateXRapParam = (api: string, body: Record<string, unknown> = {}): string =>
  xRapParam(api, body, { sdkVersion: cryptoConfig.XRAP_SDK_VERSION })

/**
 * 生成 X-S-Common 参数。
 *
 * 两条分支都走库的 `signXsCommon`：省略 b1 时由库按浏览器 3.5.6 的格式现场生成指纹，
 * 传了就原样写进 `x8`、`x9` 用前端 CRC32 变体算。
 *
 * 校验放在委托之前，因为 amagi 对外承诺的是自己的文案；库的 `validateB1` 文案不同。
 * 无 b1 分支缺 a1 时由库抛 `Missing 'a1' in cookies` —— legacy 入口对外承诺过这句。
 * @param cookies - cookie 字符串
 * @param b1 - 同一会话已有的非空白 b1；省略时由库生成，不裁剪有效输入
 * @returns Base64 编码的 X-S-Common
 */
export const generateXSCommon = (cookies: string, b1?: string): string => {
  if (b1 !== undefined) {
    if (typeof b1 !== 'string' || b1.trim().length === 0) throw new TypeError('小红书会话 b1 必须是非空白字符串')
    if (!getCookieValue(cookies, 'a1')) throw new Error('小红书 Cookie 缺少 a1')
  }
  return client.signXsCommon(cookies, b1 === undefined ? {} : { b1 })
}

/**
 * 生成 X-T 时间戳。
 * @returns 当前时间戳（毫秒）
 */
export const generateXT = (): number => client.getXT()

/**
 * 生成 X-B3-Traceid。
 * @returns 16 位随机字符串
 */
export const generateXB3Traceid = (): string => client.getB3TraceId()

/**
 * 生成 X-Xray-Traceid。
 *
 * 32 位字符（16 位时间戳+序列 + 16 位随机），随现代浏览器每次请求下发。
 * @returns X-Xray-Traceid 字符串
 */
export const generateXrayTraceid = (): string => client.getXrayTraceId()

/**
 * 生成搜索 ID。
 *
 * 交由 xhshow-ts 的 `client.getSearchId()`：base36 编码的 `(timestamp_ms << 64) + random`。
 * 旧的本地实现把 BigInt 与 string 相加，得到「十进制拼 base36 后缀」而非预期的
 * 位运算结果 —— xhshow-ts 修正后此处直接复用，不再自行拼装。
 * @returns 搜索 ID 字符串
 */
export const getSearchId = (): string => client.getSearchId()

/**
 * 生成搜索接口所需的 request_id。
 * @returns 格式为 `{random}-{timestamp_ms}` 的字符串
 */
export const getSearchRequestId = (): string => client.getSearchRequestId()

/** 搜索会话 UUID。调用方可在翻页时复用同一 session_id。 */
export const getSearchSessionId = (): string => randomUUID()
