import type { SignFn } from '../../../contracts/endpoint'
import type { RequestSpec } from '../../../contracts/request'
import { withDouyinWebid } from '../webid'
import { douyinSign } from './index'
import { applySecsdkWebSign } from './secsdkWebSign'

/**
 * 抖音签名器（SignFn 形式）。
 *
 * 签名器声明前置条件（修 #36/#37/#38）：v6 的 `douyinSign.AB` / `.XB`
 * 对入参形状零校验 —— `AB('')` 抛 `TypeError: Invalid URL`、`XB` 对短路径
 * 抛 `Invalid MD5 character`（KNOWN-DEFECT 有测试锁死）。v7 的签名器在
 * 入口先校验前置条件：
 * - **AB 需绝对 URL**（以 `http(s)://` 开头）。
 * - **XB 需真实接口形态的长路径**（pathname ≥ 3 段且带查询串）。
 *
 * 前置条件不满足时签名器**抛带明确 message 的错误** —— execute 的
 * 单一 catch 把它归因为 `kind: 'internal'` / `INTERNAL_ERROR` 收进失败
 * 信封，调用方不再面对裸的 `TypeError: Invalid URL`。这些条件由
 * `build` 保证满足（URL 构造器只产出合法绝对地址），签名器里的校验
 * 只是防线。
 *
 * ## 为什么这两个签名器前后各多一步
 *
 * 真实浏览器发这些请求的顺序是 **webid → a_bogus / x_bogus → secsdk**，三步都改
 * query，颠倒任意一步签名就不成立。所以两个签名器各自是一条三段的管线，
 * 前后那两段都是「命中才动、否则原样返回」，对不相关的端点是无操作。
 *
 * **前一步 webid**（见 {@link withDouyinWebid}）：抖音会拿 query 里的 `webid` 与 cookie
 * 会话交叉校验，对不上就静默回 0 字节。它是服务端下发的、客户端算不出来，所以只在
 * 按 ttwid 缓存命中时才补 —— 冷启动第一次不带（不带是安全的）。为什么放在签名器里
 * 而不是 `api.ts`：URL 构造是同步纯函数、拿不到 `ctx`，而签名器的入参正好是
 * `(spec, ctx)`，能读 `ctx.cookie`。
 *
 * **后一步 secsdk**：`x-secsdk-web-signature` 是抖音主站的第三种签名，浏览器里由
 * secsdk 的 JS 现算。它与 AB / XB 有三点不同（详见 {@link applySecsdkWebSign} 所在模块）：
 *
 * 1. **它改写整条 URL**，不是返回一个参数值 —— 签名算的是规范化后的 query，
 *    服务端也按收到的 query 校验；
 * 2. **只对 SDK 策略表里的 path 生效**（14 个 GET / 6 个 POST），其余原样返回，
 *    所以可以无条件套用；
 * 3. **必须是最后一步**。
 *
 * 因为第 2 点是无条件安全的，它没有单独注册成第三个签名器名，而是复合进这两个 ——
 * `sign` 是单槽位，另起一个名字只会逼出 `'a-bogus+secsdk'` 这种复合命名。
 * 影响面：`musicInfo`（`music/detail`）在策略表内，#188 实测它此前 15/15 被
 * `Blocked by ArgusSecurityPlugin Uifid Not Found` 拦死；作品详情、用户作品、
 * 喜欢列表也都在表内。`sign: false` 的两条（`emojiList` / `search`）与四条免鉴权
 * 端点不经过这里，它们的 path 也都不在策略表里、也拿不到 webid（与 v6 一致 ——
 * v6 的 `withDouyinWebid` 也只在 `buildSignedUrl` 里被调）。
 */

/** AB 前置条件：绝对 URL（`http(s)://` 开头） */
const isAbsoluteUrl = (url: string): boolean => /^https?:\/\//.test(url)

/** XB 前置条件：真实接口形态 —— pathname 至少 3 段且带查询串 */
const isApiLikePath = (url: string): boolean => {
  if (!isAbsoluteUrl(url)) return false
  const parsed = new URL(url)
  const segments = parsed.pathname.split('/').filter(Boolean)
  return segments.length >= 3 && parsed.search.length > 0
}

/**
 * 收尾一步：策略表内的 path 补上 `x-secsdk-web-signature`，表外原样返回。
 *
 * `uifid` 从本次请求的 cookie 里取（query 里已有就用 query 的）。
 * @param spec - 已经加过 a_bogus / x_bogus 的请求描述
 * @param cookie - 本次调用使用的 cookie
 * @returns 需要加签时返回改写过 URL 的请求描述，否则原样返回
 */
const withSecsdk = (spec: RequestSpec, cookie: string): RequestSpec => {
  const url = applySecsdkWebSign(spec.url, { cookie, method: spec.method })
  return url === spec.url ? spec : { ...spec, url }
}

/**
 * `a_bogus` 签名器（`sign: 'a-bogus'`）。
 *
 * 前置条件：URL 必须是绝对地址。v6 的 `AB` 对空串/相对路径抛
 * `TypeError: Invalid URL`，v7 在入口校验，抛错由 execute 归因为
 * `kind: 'internal'`（#36/#37）。
 * @param spec - 请求描述（`url` 参与签名）
 * @param ctx - 执行上下文（`userAgent` 用于签名，`cookie` 用于取 secsdk 的 uifid）
 * @returns 带 `a_bogus` 的请求描述；path 在 secsdk 策略表内时再补一层 `x-secsdk-web-signature`
 */
export const aBogusSigner: SignFn = (spec, ctx) => {
  if (!isAbsoluteUrl(spec.url)) {
    throw new Error(`a_bogus 前置条件不满足：URL 必须是绝对地址（收到 "${spec.url}"）`)
  }

  const url = new URL(withDouyinWebid(spec.url, ctx.cookie))
  url.searchParams.set('a_bogus', douyinSign.AB(url.toString(), ctx.userAgent))
  return withSecsdk({ ...spec, url: url.toString() } as RequestSpec, ctx.cookie)
}

/**
 * `x_bogus` 签名器（`sign: 'x-bogus'`）。
 *
 * 前置条件：真实接口形态的长路径（≥3 段且带查询串）。v6 的 `XB` 对短路径
 * 抛 `Invalid MD5 character`，v7 在入口校验，抛错由 execute 归因为
 * `kind: 'internal'`（#38）。
 * @param spec - 请求描述（`url` 参与签名）
 * @param ctx - 执行上下文（`userAgent` 用于签名）
 * @returns 带 `X-Bogus` 的请求描述；path 在 secsdk 策略表内时再补一层 `x-secsdk-web-signature`
 */
export const xBogusSigner: SignFn = (spec, ctx) => {
  if (!isApiLikePath(spec.url)) {
    throw new Error(
      `x_bogus 前置条件不满足：URL 需真实接口形态的长路径（≥3 段且带查询串，收到 "${spec.url}"）`
    )
  }

  const url = new URL(withDouyinWebid(spec.url, ctx.cookie))
  url.searchParams.set('X-Bogus', douyinSign.XB(url.toString(), ctx.userAgent))
  return withSecsdk({ ...spec, url: url.toString() } as RequestSpec, ctx.cookie)
}

/** 平台签名器表，交给 runtime 的 `signers` 查名 */
export const createDouyinSigners = (): Record<string, SignFn> => ({
  'a-bogus': aBogusSigner,
  'x-bogus': xBogusSigner
})
