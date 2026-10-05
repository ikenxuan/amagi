import { getCookieValue } from '../../../contracts/cookie'
import type { SignFn } from '../../../contracts/endpoint'
import { AmagiHeaders, type RequestSpec } from '../../../contracts/request'
import { resolveDouyinUifid } from '../config'
import { withDouyinWebid } from '../webid'
import { douyinSign } from './index'
import { applySecsdkWebSign } from './secsdkWebSign'

/**
 * 抖音签名器（SignFn 形式）。
 *
 * 签名器在入口先校验前置条件：
 * - **AB 需绝对 URL**（以 `http(s)://` 开头）。
 * - **XB 需真实接口形态的长路径**（pathname ≥ 3 段且带查询串）。
 *
 * 前置条件不满足时签名器**抛带明确 message 的错误** —— execute 的
 * 单一 catch 把它归因为 `kind: 'internal'` / `INTERNAL_ERROR` 收进失败
 * 信封，调用方不会拿到裸的 `TypeError`。这些条件由 `build` 保证满足
 * （URL 构造器只产出合法绝对地址），签名器里的校验只是防线。
 *
 * ## 为什么这两个签名器前后各多一步
 *
 * 真实浏览器发这些请求的顺序是 **身份参数（uifid / msToken）→ webid → a_bogus / x_bogus →
 * secsdk**，每一步都改 query，颠倒任意一步签名就不成立。所以两个签名器各自是一条五段的
 * 管线，除 a_bogus / x_bogus 外都是「命中才动、否则原样返回」，对不相关的端点是无操作。
 *
 * **前一步 webid**（见 {@link withDouyinWebid}）：抖音会拿 query 里的 `webid` 与 cookie
 * 会话交叉校验，对不上就静默回 0 字节。它是服务端下发的、客户端算不出来，所以只在
 * 按 ttwid 缓存命中时才补 —— 冷启动第一次不带（不带是安全的）。签名器的入参是
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
 * 影响面：`musicInfo`（`music/detail`）、作品详情、用户作品、喜欢列表都在策略表内。
 * `sign: false` 的两条（`emojiList` / `search`）与四条免鉴权端点不经过这里，
 * 它们的 path 也都不在策略表里、也拿不到 webid。
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
 * `uifid` 显式传入与 {@link withDouyinUifid} 双带、基线桌面形态判定同一份解析值
 * （即 cookie 的 uifid 系键值），保证「签名里算的 uifid」与「请求里带的
 * uifid」是同一个值——否则 secsdk 签名对不上，服务端按收到的 query 校验直接失败。
 * @param spec - 已经加过 a_bogus / x_bogus 的请求描述
 * @param cookie - 本次调用使用的 cookie
 * @returns 需要加签时返回改写过 URL 的请求描述，否则原样返回
 */
const withSecsdk = (spec: RequestSpec, cookie: string): RequestSpec => {
  const url = applySecsdkWebSign(spec.url, { cookie, method: spec.method, uifid: resolveDouyinUifid(cookie) })
  // 只有签名实际生效（uifid 存在且 path 在策略表内）才补 `x-secsdk-csrf-token: DOWNGRADE`
  // 回退验证开关。拿不到 uifid 时绝不能带：基线挂常开会被 Argus 判「Uifid Not Found」。
  return url === spec.url ? spec : { ...spec, url, headers: new AmagiHeaders(spec.headers).set('x-secsdk-csrf-token', 'DOWNGRADE') }
}

/**
 * 从 cookie 取真实 `msToken` 写入 query，覆盖 `getBaseParams` 的本地假值。
 *
 * 真 msToken 是服务端下发、端上只读不造的；只有当 cookie 里没有时才轮到
 * `douyinSign.Mstoken()` 的假值兜底。**query 里假 token 与 cookie 里真 token
 * 并存**会被 Argus 判为「令牌不一致」，是典型的低分特征。
 *
 * 必须在 a_bogus 签名**之前**写入（a_bogus 是对最终 query 算的）。
 * @param url - 还没加签的 URL
 * @param cookie - 本次请求使用的 cookie
 * @returns 有 cookie msToken 时补好并返回，否则原样返回
 */
const withDouyinMsToken = (url: string, cookie?: string | null): string => {
  const token = cookie ? (getCookieValue(cookie, 'msToken') ?? '') : ''
  if (!token) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url // 不是绝对 URL，交给签名器的前置校验去报错
  }
  parsed.searchParams.set('msToken', token)
  return parsed.toString()
}

/**
 * 把 uifid 以 **query + header 双带** 的形式补进请求。
 *
 * `uifid` 是 secsdk 的设备指纹，真浏览器里 query、header 各带一份，
 * `x-secsdk-web-signature` 的签名也把 uifid 算进 query。uifid 来源：实例 cookie
 * 的 uifid 系键值（与基线 `createDouyinConfig` 的桌面形态判定同口径）。拿不到时
 * 原样返回（配合 {@link applySecsdkWebSign} 的空 uifid 跳过，不产生坏签名）。
 * @param spec - 还没加签的请求描述
 * @param cookie - 本次请求使用的 cookie
 * @returns 有 uifid 时改写 URL 并带上 header，否则原样返回
 */
const withDouyinUifid = (spec: RequestSpec, cookie?: string | null): RequestSpec => {
  const uifid = resolveDouyinUifid(cookie)
  if (!uifid) return spec
  const headers = new AmagiHeaders(spec.headers).set('uifid', uifid)
  const parsed = new URL(spec.url)
  if (!parsed.searchParams.has('uifid')) parsed.searchParams.set('uifid', uifid)
  return { ...spec, url: parsed.toString(), headers }
}

/**
 * `a_bogus` 签名器（`sign: 'a-bogus'`）。
 *
 * 前置条件：URL 必须是绝对地址。不满足时抛错，由 execute 归因为
 * `kind: 'internal'`。
 * @param spec - 请求描述（`url` 参与签名）
 * @param ctx - 执行上下文（`userAgent` 用于签名，`cookie` 用于取 secsdk 的 uifid）
 * @returns 带 `a_bogus` 的请求描述；path 在 secsdk 策略表内时再补一层 `x-secsdk-web-signature`
 */
export const aBogusSigner: SignFn = (spec, ctx) => {
  if (!isAbsoluteUrl(spec.url)) {
    throw new Error(`a_bogus 前置条件不满足：URL 必须是绝对地址（收到 "${spec.url}"）`)
  }

  const bound = withDouyinUifid(spec, ctx.cookie)
  const url = new URL(withDouyinMsToken(withDouyinWebid(bound.url, ctx.cookie), ctx.cookie))
  url.searchParams.set('a_bogus', douyinSign.AB(url.toString(), ctx.userAgent))
  return withSecsdk({ ...bound, url: url.toString() } as RequestSpec, ctx.cookie)
}

/**
 * `x_bogus` 签名器（`sign: 'x-bogus'`）。
 *
 * 前置条件：真实接口形态的长路径（≥3 段且带查询串）。不满足时抛错，由
 * execute 归因为 `kind: 'internal'`。
 * @param spec - 请求描述（`url` 参与签名）
 * @param ctx - 执行上下文（`userAgent` 用于签名）
 * @returns 带 `X-Bogus` 的请求描述；path 在 secsdk 策略表内时再补一层 `x-secsdk-web-signature`
 */
export const xBogusSigner: SignFn = (spec, ctx) => {
  if (!isApiLikePath(spec.url)) {
    throw new Error(`x_bogus 前置条件不满足：URL 需真实接口形态的长路径（≥3 段且带查询串，收到 "${spec.url}"）`)
  }

  const bound = withDouyinUifid(spec, ctx.cookie)
  const url = new URL(withDouyinMsToken(withDouyinWebid(bound.url, ctx.cookie), ctx.cookie))
  url.searchParams.set('X-Bogus', douyinSign.XB(url.toString(), ctx.userAgent))
  return withSecsdk({ ...bound, url: url.toString() } as RequestSpec, ctx.cookie)
}

/** 平台签名器表，交给 runtime 的 `signers` 查名 */
export const createDouyinSigners = (): Record<string, SignFn> => ({
  'a-bogus': aBogusSigner,
  'x-bogus': xBogusSigner
})
