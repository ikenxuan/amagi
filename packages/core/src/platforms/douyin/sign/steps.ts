import type { SignStep } from '../../../contracts/endpoint'
import { AmagiHeaders, type RequestSpec } from '../../../contracts/request'
import { extractUifidFromCookie } from '../cookie'
import { douyinDeviceFpFor, withDouyinDeviceFp } from '../deviceFp'
import { douyinWebidFor, withDouyinWebid } from '../webid'
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
 * ## 主签名这一步同时负责 tail 段
 *
 * 真实浏览器的 `/aweme/v1/web/*` query 是四段式：
 *
 * ```text
 * head（device_platform,aid,channel）| 本端点参数 | env（25 个设备/网络键）| tail
 * tail = webid,uifid,msToken,a_bogus,verifyFp,fp
 * ```
 *
 * 前三段由 `api.ts` 的 `webQuery` 同步拼好，**tail 整段落在这里** —— 那几个值要么来自
 * cookie（webid / uifid / verifyFp）、要么是签名自己（msToken / a_bogus），只有签名层
 * 同时看得到 URL 与 `ctx.cookie`。
 *
 * tail 的内部顺序不是风格问题：**a_bogus 签的是它自己之前那段 query**，所以
 * `webid` / `uifid` / `msToken` 必须先进去、`verifyFp` / `fp` 必须后进。{@link signWebLayout}
 * 整段摘掉再按序追加（`URLSearchParams.set` 对已有键是原位替换，不摘就留在原位）。
 * 这个「谁在签名前、谁在签名后」的不变量由 `SignPhase` 收进机制层
 * （`prepare` → `token` → `sign` → `finalize`），不靠端点声明处自觉。
 *
 * 各键的取值规则：
 *
 * - **webid**（见 {@link withDouyinWebid}）：服务端按 ttwid 算出来下发的，客户端算不出来。
 *   抖音拿它与 cookie 会话交叉校验，对不上就静默回 HTTP 200 + 0 字节。所以只在缓存命中时
 *   才补，冷启动第一次不带 —— **不传安全，传错致命**。
 * - **uifid**：取 cookie 的 `UIFID`（`UIFID_TEMP` 由 {@link extractUifidFromCookie} 归一）。
 *   浏览器在 query 带 uifid 时同时发一个**同名请求头**、值相同，所以这里一并设上。
 * - **verifyFp / fp**（见 {@link douyinDeviceFpFor}）：浏览器里恒等于 cookie 的 `s_v_web_id`。
 *   与 webid 相反，这两个是**客户端自己生成**的设备 id，cookie 里没有时发进程级兜底值
 *   比不发更像真实浏览器。
 *
 * 版式之外的三条（`iesdouyin` 动图、`live.douyin.com` 直播间、`sso` 登录码）query 不是
 * 四段式、键序也没有抓包依据，仍走 {@link withDouyinDeviceFp} 的原位覆盖老路。
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

/** 三段式版式的 path 前缀：只有这些端点的 query 是 `head|endpoint|env|tail` 布局 */
const WEB_LAYOUT_PATH = '/aweme/v1/web/'

/**
 * tail 段的全部键名。
 *
 * 追加前先整段摘掉：`URLSearchParams.set` 对已存在的键是**原位替换**，
 * 不摘就会把 tail 留在它原来的位置上，版式对不上。
 */
const TAIL_KEYS = ['webid', 'uifid', 'msToken', 'a_bogus', 'X-Bogus', 'verifyFp', 'fp'] as const

/** 往 spec 上加一个请求头（`AmagiHeaders` 大小写不敏感，重复设置即覆盖） */
const withHeader = (spec: RequestSpec, name: string, value: string): RequestSpec => {
  const headers = new AmagiHeaders(spec.headers).set(name, value)
  return { ...spec, headers: headers.toJSON() }
}

/** 签名器：拿整条 URL，返回要写进 query 的 `[键, 值]` */
type BogusSigner = (fullUrl: string) => [key: string, value: string]

/** `apply` 收到的执行上下文（`EndpointCtx`，这里只用 cookie / userAgent） */
type SignCtx = Parameters<SignStep['apply']>[1]

/**
 * 按浏览器版式给 `/aweme/v1/web/*` 整段追加 tail 并签名。
 *
 * tail 的顺序是 `webid,uifid,msToken,<主签名>,verifyFp,fp`，与 2026-10-05 抓包
 * 逐键一致。**主签名之前 / 之后的分界是有含义的**：a_bogus 签的是它自己之前的那段
 * query，所以 `webid` / `uifid` / `msToken` 必须先进去，而 `verifyFp` / `fp` 必须后进 ——
 * 浏览器也是这么排的，顺序错了签出来的值就对不上。
 * @param url - 已经拼好 head / endpoint / env 三段的 URL（原地改写其 searchParams）
 * @param ctx - 执行上下文，取 `cookie` 与 `userAgent`
 * @param sign - 主签名算子（a_bogus 或 X-Bogus）
 * @returns 签好的 URL 与本次发出的 `uifid`（空串表示没发）
 */
const signWebLayout = (url: URL, ctx: SignCtx, sign: BogusSigner): { url: string; uifid: string } => {
  const q = url.searchParams
  const ms = q.get('msToken')
  for (const key of TAIL_KEYS) q.delete(key)

  // webid 服务端算得出真值，对不上就静默回 0 字节 —— 只在缓存命中时补
  const webid = douyinWebidFor(ctx.cookie)
  if (webid) q.set('webid', webid)
  const uifid = extractUifidFromCookie(ctx.cookie)
  if (uifid) q.set('uifid', uifid)
  if (ms !== null) q.set('msToken', ms)

  const [sigKey, sigValue] = sign(url.toString())
  q.set(sigKey, sigValue)

  // verifyFp / fp 是客户端自己生成的设备 id，cookie 里没有也要发（见 douyinDeviceFpFor）
  const deviceFp = douyinDeviceFpFor(ctx.cookie)
  q.set('verifyFp', deviceFp)
  q.set('fp', deviceFp)
  return { url: url.toString(), uifid }
}

/**
 * 主签名（a_bogus / X-Bogus）的公共实现：按 path 分流到版式追加或原位覆盖。
 *
 * 版式之外那几条（`iesdouyin` 动图、`live.douyin.com` 直播间、`sso` 登录码）的 query
 * 不是三段式，键序没有可对齐的抓包依据，所以维持原位覆盖的老行为。
 * @param spec - 待签的请求
 * @param ctx - 执行上下文
 * @param sign - 主签名算子
 * @returns 签好的请求
 */
const applyBogus = (spec: RequestSpec, ctx: SignCtx, sign: BogusSigner): RequestSpec => {
  const parsed = new URL(spec.url)
  if (!parsed.pathname.startsWith(WEB_LAYOUT_PATH)) {
    const url = new URL(withDouyinDeviceFp(withDouyinWebid(spec.url, ctx.cookie), ctx.cookie))
    const [key, value] = sign(url.toString())
    url.searchParams.set(key, value)
    return { ...spec, url: url.toString() }
  }
  const { url, uifid } = signWebLayout(parsed, ctx, sign)
  const next: RequestSpec = { ...spec, url }
  // query 里带 uifid 的请求，浏览器同时发一个同名请求头、值相同
  return uifid ? withHeader(next, 'uifid', uifid) : next
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
 * `a_bogus` 签名。
 *
 * `/aweme/v1/web/*` 走版式追加（见 {@link signWebLayout}），其余端点原位覆盖设备参数。
 * 前置：URL 必须是绝对地址，不满足抛错（execute 归因 `kind: 'internal'`）。不含 secsdk ——
 * 需要收尾签名的端点再 append 一个 {@link secsdk}。
 */
export const aBogus = (): SignStep => ({
  phase: 'sign',
  apply: (spec, ctx) => {
    if (!isAbsoluteUrl(spec.url)) {
      throw new Error(`a_bogus 前置条件不满足：URL 必须是绝对地址（收到 "${spec.url}"）`)
    }
    return applyBogus(spec, ctx, (full) => ['a_bogus', douyinSign.AB(full, ctx.userAgent)])
  }
})

/**
 * `X-Bogus` 签名（分流规则同 {@link aBogus}）。
 *
 * 前置：真实接口形态的长路径（≥3 段且带查询串），不满足抛错。不含 secsdk。
 */
export const xBogus = (): SignStep => ({
  phase: 'sign',
  apply: (spec, ctx) => {
    if (!isApiLikePath(spec.url)) {
      throw new Error(`x_bogus 前置条件不满足：URL 需真实接口形态的长路径（≥3 段且带查询串，收到 "${spec.url}"）`)
    }
    return applyBogus(spec, ctx, (full) => ['X-Bogus', douyinSign.XB(full, ctx.userAgent)])
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
