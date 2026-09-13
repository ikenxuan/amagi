/**
 * 小红书签名算法。
 *
 * 包装 `@ikenxuan/xhshow-ts` 的 `Xhshow` 实例，提供 GET / POST / X-S-Common /
 * X-T / X-B3-Traceid / 搜索 ID 的生成函数。a1 从 cookie 取值的逻辑用
 * `contracts/cookie.ts` 的 `getCookieValue`。
 *
 * `Xhshow` 实例是模块级单例，行为与性能无额外开销。
 */
import { Xhshow } from '@ikenxuan/xhshow-ts'

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
export const generateXSGet = (path: string, a1Cookie: string, clientType: string = 'xhs-pc-web', params: Record<string, unknown> = {}): string =>
  client.signXsGet(path, a1Cookie, clientType, params)

/**
 * 生成 POST 请求的 X-S 签名。
 * @param path - API 路径
 * @param a1Cookie - a1 cookie 值
 * @param clientType - 客户端类型，默认 `'xhs-pc-web'`
 * @param body - 请求体对象
 * @returns X-S 签名
 */
export const generateXSPost = (path: string, a1Cookie: string, clientType: string = 'xhs-pc-web', body: Record<string, unknown> = {}): string =>
  client.signXsPost(path, a1Cookie, clientType, body)

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
 * 生成搜索 ID。
 *
 * 实现为 `(BigInt(Date.now()) << 64n) + BigInt(Math.floor(Math.random() * 2147483646)).toString(36)`。
 * 注意：BigInt 与 string 相加，结果是十进制拼 base36 后缀而非预期的位运算结果 ——
 * 这里保持该行为不变。
 * @returns 搜索 ID 字符串
 */
export const getSearchId = (): string => (BigInt(Date.now()) << 64n) + BigInt(Math.floor(Math.random() * 2147483646)).toString(36)