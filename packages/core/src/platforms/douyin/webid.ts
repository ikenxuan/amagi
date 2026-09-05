import { getCookieValue } from '../../contracts/cookie'
import type { RawResponse } from '../../contracts/request'

/**
 * 抖音 `webid` 的取得与缓存。
 *
 * `webid` 是服务端下发的访客 id，**客户端算不出来** —— 服务端按 `ttwid` 算好之后，
 * 通过每个响应的 `cookie_ttwidinfo_webid` 头告知。一个 ttwid 对应一个稳定的 webid。
 *
 * 抖音会拿 query 里的 `webid` 与 cookie 的会话交叉校验，对不上就返回 HTTP 200 +
 * 空 body（不是 403、也不是业务码），最典型的受害者是 `aweme/favorite`。#188 的实测：
 *
 * ```text
 * 浏览器真实的 webid  →  200，1,116,615 字节，19 条
 * 代码里写死的那个    →  200,         0 字节，空
 * 干脆不传            →  200，1,116,776 字节，19 条
 * ```
 *
 * **不传安全，传错致命。** 所以 v7 删掉了 `api.ts` 里 13 处写死值，只在缓存命中时才补。
 * 缓存按 ttwid 分键：换了 cookie，webid 就得跟着换。
 *
 * 顺带澄清一个容易误解的点：填别人的 `webid` **不会**拿到别人的数据 ——
 * 「看谁」由 `sec_user_id` 决定，`webid` 只是设备一致性校验，身份来自 cookie 的
 * `sessionid`。填错只会被拒绝。
 *
 * ## 与 v6 那份的差异
 *
 * v6 版本（`platform/douyin/webid.ts`）从 axios 的 `config.headers.Cookie` 里用裸正则
 * 取 ttwid、再对 URL 做字符串拼接。v7 这份接的是端点管线：
 *
 * - 键取自 `ctx.cookie`，解析走 `contracts/cookie.ts` 的 `getCookieValue`
 *   （全仓唯一一份 cookie 解析，别再写第二个正则）；
 * - 回收由平台级 `observe` 钩子在每次 send 之后调用，读 `RawResponse.headers`；
 * - 注入由 `sign/signers.ts` 里的第一步完成（`webid → a_bogus/x_bogus → secsdk`），
 *   而不是让同步的 URL 构造去依赖运行期状态。
 *
 * ## 作用域：进程级
 *
 * 与 `platforms/kuaishou/did.ts` 同一条记账：**这是进程级的，不是每 client 一份** ——
 * 端点定义本身就是模块级单例。要按 client 隔离得把状态搬到 `ClientCtx` 上，本次不做。
 * 多 cookie 场景靠 ttwid 分键区分，所以「串用别人的 webid」不会发生。
 *
 * @module platforms/douyin/webid
 */

/** ttwid → webid。webid 对同一 ttwid 是稳定的，进程内缓存即可 */
const cache = new Map<string, string>()

/** 抖音回传 webid 的响应头 */
export const WEBID_HEADER = 'cookie_ttwidinfo_webid'

/** webid 的形状：纯数字、至少 6 位。不合形状的值一律不收 —— 传错比不传更糟 */
const WEBID_SHAPE = /^\d{6,}$/

/**
 * 从 cookie 串里取 `ttwid`，用作缓存键
 * @param cookie - 本次调用使用的 cookie
 * @returns `ttwid` 的值，取不到时返回空串
 */
const ttwidOf = (cookie?: string | null): string => (cookie ? getCookieValue(cookie, 'ttwid') ?? '' : '')

/**
 * 看到响应头里的 webid 就记下来。没有这个头、值不合形状、或 cookie 里没有 ttwid
 * （无从分键）时都是无操作。
 * @param res - 本次请求的原始响应
 * @param cookie - 本次请求使用的 cookie，用于取 ttwid 作为缓存键
 */
export const rememberDouyinWebid = (res: RawResponse, cookie?: string | null): void => {
  const webid = res.headers.get(WEBID_HEADER)
  if (!webid || !WEBID_SHAPE.test(webid)) return
  const key = ttwidOf(cookie)
  if (key) cache.set(key, webid)
}

/**
 * 取这份 cookie 对应的 webid
 * @param cookie - 本次调用使用的 cookie
 * @returns 缓存里的 webid，没有时返回空串
 */
export const douyinWebidFor = (cookie?: string | null): string => cache.get(ttwidOf(cookie)) ?? ''

/**
 * 给 URL 补上 `webid`。
 *
 * 必须在算 a_bogus 之前调用：真实浏览器的顺序是「拼好 query（含 webid）→ a_bogus →
 * secsdk 签名」，后两者都覆盖 query，顺序错了签名就不成立。
 * URL 里已有 `webid`、或缓存里没有值时原样返回。
 * @param url - 还没加签的 URL
 * @param cookie - 本次请求使用的 cookie
 * @returns 补好 `webid` 的 URL
 */
export const withDouyinWebid = (url: string, cookie?: string | null): string => {
  const webid = douyinWebidFor(cookie)
  if (!webid) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url // 不是绝对 URL，交给签名器的前置校验去报错
  }
  if (parsed.searchParams.has('webid')) return url
  parsed.searchParams.set('webid', webid)
  return parsed.toString()
}

/**
 * 平台级 `observe` 钩子：挂在 `PLATFORM_RUNTIME.douyin` 上，每次 send 之后被调一次。
 *
 * **自己吞异常** —— 契约是「只读、不抛、不改判定」。回收 webid 失败只该让下一次
 * 请求少一个参数（不带是安全的），不该把一个本来成功的调用变成 `kind: 'internal'`。
 * @param res - 本次请求的原始响应
 * @param ctx - 当刻的执行上下文（只读 `cookie`）
 */
export const observeDouyinWebid = (res: RawResponse, ctx: { cookie: string }): void => {
  try {
    rememberDouyinWebid(res, ctx.cookie)
  } catch {
    /* 只读旁观者不该影响本次调用 */
  }
}

/**
 * 清空缓存。**只给测试用** —— 缓存是模块级的，用例之间会互相看见。
 */
export const resetDouyinWebidCache = (): void => cache.clear()
