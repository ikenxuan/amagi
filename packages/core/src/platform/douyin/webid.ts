/**
 * 抖音 `webid` 的取得与缓存。
 *
 * `webid` 是服务端下发的访客 id，客户端算不出来 —— 服务端按 `ttwid` 算好之后，
 * 通过每个响应的 `cookie_ttwidinfo_webid` 头告知。一个 ttwid 对应一个稳定的 webid。
 *
 * 抖音会拿 query 里的 `webid` 与 cookie 的会话交叉校验，对不上就返回 HTTP 200 + 空 body
 * （不是 403、也不是业务码），最典型的受害者是 `aweme/favorite`。因此缓存必须按 ttwid 分键：
 * 换了 cookie，webid 就得跟着换。取不到时不传 —— 不传是安全的，传错才致命。
 *
 * @module platform/douyin/webid
 */

/** ttwid → webid。webid 对同一 ttwid 是稳定的，进程内缓存即可 */
const cache = new Map<string, string>()

/** 抖音回传 webid 的响应头 */
const WEBID_HEADER = 'cookie_ttwidinfo_webid'

/**
 * 从 cookie 串里取 `ttwid`，用作缓存键
 *
 * @param cookie - cookie 串
 * @returns `ttwid` 的值，取不到时返回空串
 */
const ttwidOf = (cookie?: string | null): string => {
  if (!cookie) return ''
  const hit = /(?:^|;\s*)ttwid=([^;]*)/.exec(cookie)
  return hit ? hit[1].trim() : ''
}

/**
 * 看到响应头就把 webid 记下来，对没有这个头的响应是无操作
 *
 * @param requestHeaders - 请求头，用于取 cookie 里的 ttwid 作为键
 * @param responseHeaders - 响应头
 */
export const rememberDouyinWebid = (
  requestHeaders: Record<string, any> | undefined,
  responseHeaders: Record<string, any> | undefined
): void => {
  const webid = responseHeaders?.[WEBID_HEADER]
  if (typeof webid !== 'string' || !/^\d{6,}$/.test(webid)) return
  const key = ttwidOf(requestHeaders?.Cookie ?? requestHeaders?.cookie)
  if (key) cache.set(key, webid)
}

/**
 * 取这份 cookie 对应的 webid
 *
 * @param cookie - cookie 串
 * @returns 缓存里的 webid，没有时返回空串
 */
export const douyinWebidFor = (cookie?: string | null): string => cache.get(ttwidOf(cookie)) ?? ''

/**
 * 给 URL 补上 `webid`
 *
 * 必须在算 a_bogus 之前调用：真实浏览器的顺序是「拼好 query（含 webid）→ a_bogus → secsdk 签名」，
 * 后两者都覆盖 query，顺序错了签名就不成立。URL 里已有 `webid` 或缓存为空时原样返回。
 *
 * @param url - 还没加签的 URL
 * @param cookie - 本次请求使用的 cookie
 * @returns 补好 `webid` 的 URL
 */
export const withDouyinWebid = (url: string, cookie?: string | null): string => {
  if (url.includes('webid=')) return url
  const webid = douyinWebidFor(cookie)
  if (!webid) return url
  return `${url}${url.includes('?') ? '&' : '?'}webid=${webid}`
}
