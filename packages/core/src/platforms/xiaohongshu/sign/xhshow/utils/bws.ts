/**
 * 浏览器搜索网关 `bws.xiaohongshu.com` 的请求口径。
 *
 * 这条「小红书浏览器」H5 业务线与 `edith` 是两套鉴权：**不需要 x-s、x-s-common，
 * 也不需要 Cookie**，所以这里只负责拼请求体，不涉及签名。两个坑都在「必填但看着可选」：
 *
 * - 搜索请求体缺 `xhsBrowserChannel` 时服务端回 `code: -1`「内部错误」，
 *   不提示缺什么。取值不校验，任意字符串都行
 * - ID 解密请求体缺 `resourceType` 回 HTTP 400 `code: -1`；取值不影响结果（1、2、'abc' 都行）
 *
 * 2026-09-26 已真机复测上面两条。
 */

/** 浏览器搜索网关。 */
export const BWS_BASE_URL = 'https://bws.xiaohongshu.com'
/** 浏览器搜索接口。 */
export const BWS_SEARCH_PATH = '/api/growth/browser/search/result'
/** 加密 ID 解密接口，笔记 ID 与用户 ID 共用。 */
export const BWS_RESOURCE_DECRYPT_PATH = '/api/growth/resource/decrypt'

/** 浏览器搜索参数。 */
export interface BrowserSearchParams {
  /** 搜索关键词 */
  keyword: string
  /** 页码，从 1 开始 */
  page?: number
  /** 每页数量，服务端上限 20 */
  pageSize?: number
  /** 同一次搜索的标识，翻页时保持一致；省略时自动生成 */
  searchId?: string
  /** 渠道标识，必填但不校验取值，默认 `'default'` */
  channel?: string
}

/**
 * 构造浏览器搜索的请求体。
 *
 * 字段名是驼峰：该接口前端配置 `transform: false`，不做蛇形转换。
 * @param params - 搜索参数
 * @returns 可直接 JSON 序列化的请求体
 */
export function buildBrowserSearchBody(params: BrowserSearchParams): Record<string, unknown> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  const searchId = params.searchId ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  return {
    keyword: params.keyword,
    page,
    pageSize,
    scene: 'ecology',
    source: 'ecology',
    searchId,
    requestId: searchId,
    pagePos: (page - 1) * pageSize,
    sessionId: Math.random().toString(36).slice(2, 4),
    xhsBrowserChannel: params.channel ?? 'default'
  }
}

/**
 * 构造加密 ID 解密的请求体。
 *
 * 搜索结果里的 `note.id` / `note.user.userid` 是 46 位加密串，解开后是标准 24 位 hex。
 * @param resourceId - 加密串
 * @param resourceType - 必填，取值不影响结果，默认 1
 * @returns 请求体
 */
export function buildResourceDecryptBody(resourceId: string, resourceType: number | string = 1): Record<string, unknown> {
  return { resourceId, resourceType }
}

/**
 * 浏览器搜索与 ID 解密接口的请求头。`uuid` 是前端硬编码值，服务端不校验。
 * @returns 请求头
 */
export function buildBrowserSearchHeaders(): Record<string, string> {
  return {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json;charset=UTF-8',
    uuid: '000000'
  }
}

/**
 * 判断某个 UA 会不会被 bws 网关拦截：空串 UA 返回 HTTP 461。
 *
 * 网关曾单独拦过 `Edg/141.0.0.0`（461 `verifyType: 216`），2026-09-26 复测已放行，
 * 所以这里只剩空串一条。不带 user-agent 头时 Node 会用自己的默认 UA，不受影响。
 * @param userAgent - 待检查的 UA
 * @returns 会被拦截时为 true
 */
export function isBlockedByBwsGateway(userAgent: string): boolean {
  return userAgent === ''
}
