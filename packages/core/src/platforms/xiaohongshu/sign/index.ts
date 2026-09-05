/**
 * 小红书签名算法（原样搬迁，快照一字不变）。
 *
 * 包装 `@ikenxuan/xhshow-ts` 的 `Xhshow` 实例，提供与 v6 `xiaohongshuSign`
 * 类完全相同的 API。v6 的 `extractA1FromCookie` 已废弃 —— 改用
 * `contracts/cookie.ts` 的 `getCookieValue`。
 *
 * 与 v6 的一处结构差异：`Xhshow` 实例不再 static 在类上，改为模块级单例，
 * 行为与性能无变化。
 */
import { Xhshow } from '@ikenxuan/xhshow-ts'

import { createXiaohongshuCryptoConfig } from './config'

export { createXiaohongshuGuestCookie } from './guestCookie'

/** 模块级 Xhshow 单例（v6 是 static 类成员，行为等同于单例） */
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
 * v6 的实现是 `(BigInt(Date.now()) << 64n) + BigInt(Math.floor(Math.random() * 2147483646)).toString(36)`。
 * 注意：BigInt 与 string 相加导致结果是十进制拼 base36 而非预期的位运算，
 * 此处保持与 v6 一致的行为（KNOWN-DEFECT 有测试锁死这个行为）。
 * @returns 搜索 ID 字符串
 */
export const getSearchId = (): string => (BigInt(Date.now()) << 64n) + BigInt(Math.floor(Math.random() * 2147483646)).toString(36)