import type { SignStep } from '../../../contracts/endpoint'
import { withDouyinWebid } from '../webid'
import { douyinSign } from './index'
import { applySecsdkWebSign } from './secsdkWebSign'

/**
 * 抖音反爬参数的原子单元（{@link SignStep}）—— 本平台签名的**唯一实现**。
 *
 * 端点用 `sign: [msToken(184), aBogus(), secsdk()]` 直接列出要哪些参数；顺序由每个单元
 * 的 `phase` 决定，端点作者不用手排（详见 {@link SignStep}）。
 * `sign/signers.ts` 那张注册名表是**薄壳**，只把名字映射到这里的预设，不含算法 ——
 * 单向依赖 `signers.ts → steps.ts`，永不反向。两份实现会悄悄签得不一样，而抖音是
 * **抽样校验**的（大部分请求照样成功，只是被判高风险概率上升），那类分叉极难发现。
 *
 * ## 前置条件不满足时抛错，不返回半成品
 *
 * 各单元在入口先校验：**msToken / AB 需绝对 URL**（以 `http(s)://` 开头）、
 * **XB 还要求真实接口形态的长路径**（pathname ≥ 3 段且带查询串）。
 *
 * 不满足时**抛带明确 message 的错误** —— execute 的单一 catch 把它归因为
 * `kind: 'internal'` / `INTERNAL_ERROR` 收进失败信封，调用方不会拿到裸的
 * `TypeError: Invalid URL`。这些条件由 `build` 保证满足（URL 构造器只产出合法绝对
 * 地址），校验只是防线；`client.<平台>.request` 那条路的 URL 来自调用方，防线才真正
 * 用得上。三个单元都各自校验、不依赖「前一个已经查过」：phase 排序决定谁先跑，
 * 而端点可以只挑其中一个。
 *
 * ## 为什么这条链前后各多一步
 *
 * 真实浏览器发这些请求的顺序是 **webid → msToken → a_bogus / x_bogus → secsdk**，每一步都改
 * query，颠倒任意一步签名就不成立 —— 主签名算的是**含前面所有参数**的整条 URL。这个顺序
 * 不变量由 `SignPhase` 收进机制层（`prepare` → `token` → `sign` → `finalize`），
 * 不靠每个端点声明处自觉。首尾两步都是「命中才动、否则原样返回」，对不相关的端点是无操作。
 *
 * **头一步 webid**（见 {@link withDouyinWebid}，并进了 {@link aBogus} / {@link xBogus} 内部）：
 * 抖音会拿 query 里的 `webid` 与 cookie 会话交叉校验，对不上就静默回 0 字节。它是服务端
 * 下发的、客户端算不出来，所以只在按 ttwid 缓存命中时才补 —— 冷启动第一次不带
 * （不带是安全的，传错比不传更糟）。`apply` 的入参是 `(spec, ctx)`，能读 `ctx.cookie`。
 *
 * **收尾 secsdk**：`x-secsdk-web-signature` 是抖音主站的第三种签名，浏览器里由 secsdk 的 JS
 * 现算。它与 AB / XB 有三点不同（详见 {@link applySecsdkWebSign} 所在模块）：
 *
 * 1. **它改写整条 URL**，不是返回一个参数值 —— 签名算的是规范化后的 query，
 *    服务端也按收到的 query 校验；
 * 2. **只对 SDK 策略表里的 path 生效**（14 个 GET / 6 个 POST），其余原样返回，
 *    所以 append 恒安全；
 * 3. **必须是最后一步**（`phase: 'finalize'`）。
 *
 * 影响面：`musicInfo`（`music/detail`）、作品详情、用户作品、喜欢列表都在策略表内。
 * `sign: [msToken(184)]` 的两条（`emojiList` / `search`）与四条免鉴权端点（`sign: false`）
 * 不取 secsdk，它们的 path 也都不在策略表里、也拿不到 webid。
 */

/** AB 前置条件：绝对 URL（`http(s)://` 开头） */
const isAbsoluteUrl = (url: string): boolean => /^https?:\/\//.test(url)

/** XB 前置条件：真实接口形态 —— pathname 至少 3 段且带查询串 */
const isApiLikePath = (url: string): boolean => {
  if (!isAbsoluteUrl(url)) return false
  const parsed = new URL(url)
  return parsed.pathname.split('/').filter(Boolean).length >= 3 && parsed.search.length > 0
}

/**
 * `msToken`：本地随机令牌，长度按端点定（作品详情类 184、评论/音乐等 116）。
 *
 * phase = `'token'`：必须先于 a_bogus / x_bogus 进 URL —— 主签名算的是含 msToken 的整条 URL。
 *
 * 前置：URL 必须是绝对地址。**这道校验不能省** —— 本单元在 phase 序里先于 {@link aBogus} /
 * {@link xBogus}，相对 URL 会在这里就撞上 `new URL()`，抛裸 `TypeError: Invalid URL`，把
 * 后面那两句「前置条件不满足」的明确报错整个盖掉（信封 kind 仍是 internal，但 message
 * 没法告诉调用方到底哪里不对）。
 *
 * **会覆盖 URL 里已有的 `msToken`**。对端点无影响（`build` 不再写这个参数）；对
 * `client.<平台>.request` 那条路，调用方自己拼的值会被换掉。选「覆盖」而非「有则不动」，
 * 是因为后者会让 `retryFresh` 的重试一直复用调用方那个过期 token —— Argus 按**单次请求的
 * token 组**判定，重放必然同样被拦，重试就白跑了。真要自己掌控的调用方，不放本单元即可
 * （`sign: [aBogus(), secsdk()]`），URL 里原有的 msToken 就会留着。
 * @param length - `==` 之前的随机段长度
 */
export const msToken = (length: number): SignStep => ({
  phase: 'token',
  apply: (spec) => {
    if (!isAbsoluteUrl(spec.url)) {
      throw new Error(`msToken 前置条件不满足：URL 必须是绝对地址（收到 "${spec.url}"）`)
    }
    const url = new URL(spec.url)
    url.searchParams.set('msToken', douyinSign.Mstoken(length))
    return { ...spec, url: url.toString() }
  }
})

/**
 * `a_bogus` 签名（内部先补 webid，命中 ttwid 缓存才补）。
 *
 * 前置：URL 必须是绝对地址，不满足抛错（execute 归因 `kind: 'internal'`）。不含 secsdk ——
 * 需要收尾签名的端点再 append 一个 {@link secsdk}。
 */
export const aBogus = (): SignStep => ({
  phase: 'sign',
  apply: (spec, ctx) => {
    if (!isAbsoluteUrl(spec.url)) {
      throw new Error(`a_bogus 前置条件不满足：URL 必须是绝对地址（收到 "${spec.url}"）`)
    }
    const url = new URL(withDouyinWebid(spec.url, ctx.cookie))
    url.searchParams.set('a_bogus', douyinSign.AB(url.toString(), ctx.userAgent))
    return { ...spec, url: url.toString() }
  }
})

/**
 * `X-Bogus` 签名（内部先补 webid）。
 *
 * 前置：真实接口形态的长路径（≥3 段且带查询串），不满足抛错。不含 secsdk。
 */
export const xBogus = (): SignStep => ({
  phase: 'sign',
  apply: (spec, ctx) => {
    if (!isApiLikePath(spec.url)) {
      throw new Error(`x_bogus 前置条件不满足：URL 需真实接口形态的长路径（≥3 段且带查询串，收到 "${spec.url}"）`)
    }
    const url = new URL(withDouyinWebid(spec.url, ctx.cookie))
    url.searchParams.set('X-Bogus', douyinSign.XB(url.toString(), ctx.userAgent))
    return { ...spec, url: url.toString() }
  }
})

/**
 * `x-secsdk-web-signature` 收尾：策略表内的 path 才改写整条 URL，表外原样返回（append 恒安全）。
 *
 * phase = `'finalize'`：必须是最后一步。
 */
export const secsdk = (): SignStep => ({
  phase: 'finalize',
  apply: (spec, ctx) => {
    const url = applySecsdkWebSign(spec.url, { cookie: ctx.cookie, method: spec.method })
    return url === spec.url ? spec : { ...spec, url }
  }
})

/**
 * 抖音作品 / 接口类的常用组合：msToken + a_bogus + secsdk。
 * @param msLen - msToken 随机段长度
 */
export const douyinBogus = (msLen: number): SignStep[] => [msToken(msLen), aBogus(), secsdk()]

/**
 * x_bogus 版组合：msToken + X-Bogus + secsdk（如 commentReplies）。
 * @param msLen - msToken 随机段长度
 */
export const douyinXBogus = (msLen: number): SignStep[] => [msToken(msLen), xBogus(), secsdk()]
