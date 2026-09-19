/**
 * 小红书签名算法。
 *
 * 包装 `@ikenxuan/xhshow-ts` 的 `Xhshow` 实例，提供 GET / POST / X-S-Common /
 * X-T / X-B3-Traceid / X-Xray-Traceid / X-Rap-Param / 搜索 ID / 搜索 request_id
 * 的生成函数。a1 从 cookie 取值的逻辑用 `contracts/cookie.ts` 的 `getCookieValue`。
 *
 * `Xhshow` 实例是模块级单例，行为与性能无额外开销。
 *
 * 上游 2026-02 之后的新协议由这里落地：
 * - **XYW_ 格式**（`generateXSGetXyw` / `generateXSPostXyw`）：数据获取类接口
 *   （`user_posted`、`user/otherinfo` 等）自 2026-03 起以 HTTP 406 拒绝传统 XYS_
 *   格式，改用基于 AES-128-CBC 的 XYW_ 签名。x-s 值以 `XYW_` 开头。
 * - **x-rap-param**（`generateXRapParam`）：feed / 搜索 / 发布类接口的额外校验头。
 * - **x-xray-traceid**（`generateXrayTraceid`）：追踪头，随现代浏览器每次请求下发。
 * - **search request_id**（`getSearchRequestId`）：搜索接口所需的 `{random}-{ts_ms}`。
 */
import { Xhshow, xRapParam } from '@ikenxuan/xhshow-ts'

import { createXiaohongshuCryptoConfig } from './config'

export { createXiaohongshuGuestCookie } from './guestCookie'

/** 模块级 Xhshow 单例 */
const client = new Xhshow(createXiaohongshuCryptoConfig())

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
  params: Record<string, unknown> = {}
): string => client.signXsGet(path, a1Cookie, clientType, params)

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
  body: Record<string, unknown> = {}
): string => client.signXsPost(path, a1Cookie, clientType, body)

/**
 * 生成 GET 请求的 XYW_ 格式 X-S 签名（AES-128-CBC）。
 *
 * 数据获取类接口（`user_posted` 等）自 2026-03 起以 HTTP 406 拒绝 XYS_ 格式，
 * 需改用本函数。返回值以 `XYW_` 开头，走独立于 `signXsGet` 的加密路径。
 * @param path - API 路径，如 `/api/sns/web/v1/user_posted`
 * @param a1Cookie - a1 cookie 值
 * @param clientType - 客户端类型，默认 `'xhs-pc-web'`
 * @param params - 查询参数对象
 * @returns XYW_ 格式 X-S 签名
 */
export const generateXSGetXyw = (
  path: string,
  a1Cookie: string,
  clientType: string = 'xhs-pc-web',
  params: Record<string, unknown> = {}
): string => client.signXyw('GET', path, a1Cookie, clientType, params)

/**
 * 生成 POST 请求的 XYW_ 格式 X-S 签名（AES-128-CBC）。
 * @param path - API 路径
 * @param a1Cookie - a1 cookie 值
 * @param clientType - 客户端类型，默认 `'xhs-pc-web'`
 * @param body - 请求体对象
 * @returns XYW_ 格式 X-S 签名
 */
export const generateXSPostXyw = (
  path: string,
  a1Cookie: string,
  clientType: string = 'xhs-pc-web',
  body: Record<string, unknown> = {}
): string => client.signXyw('POST', path, a1Cookie, clientType, body)

/**
 * 生成 X-Rap-Param 请求头（feed / 搜索 / 发布类接口的额外校验）。
 * @param api - 请求 API，形如 `//edith.xiaohongshu.com/api/sns/web/v1/feed`（含 host、去协议）
 * @param body - 请求体对象（GET 传空对象）
 * @returns Base64 编码的 x-rap-param 字符串
 */
export const generateXRapParam = (api: string, body: Record<string, unknown> = {}): string => xRapParam(api, body)

/**
 * 生成 X-S-Common 参数。
 * @param cookies - cookie 字符串
 * @returns Base64 编码的随机字符串
 */
export const generateXSCommon = (cookies: string): string => client.signXsCommon(cookies)

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
 * 交由上游 `client.getSearchId()`：base36 编码的 `(timestamp_ms << 64) + random`。
 * 旧的本地实现把 BigInt 与 string 相加，得到「十进制拼 base36 后缀」而非预期的
 * 位运算结果 —— 上游修正后此处直接复用，不再自行拼装。
 * @returns 搜索 ID 字符串
 */
export const getSearchId = (): string => client.getSearchId()

/**
 * 生成搜索接口所需的 request_id。
 * @returns 格式为 `{random}-{timestamp_ms}` 的字符串
 */
export const getSearchRequestId = (): string => client.getSearchRequestId()
