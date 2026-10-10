/**
 * 抖音 Argus 反爬挑战页的形态识别。
 *
 * 服务器按「缺什么验什么」下发挑战页，三种形态都是「整页 HTML + 一段 JS」，
 * 判据只认**挑战页独有的脚本锚点**：
 *
 * | 形态 | 锚点 | 本仓处置 |
 * | --- | --- | --- |
 * | `waf` | `_wafchallengeid` / `WAFJS` | 自动解（{@link solveWafChallenge}），纯 sha256 计算 |
 * | `vmp` | `_$jsvmprt`（响应体）/ `__ac_nonce`（响应头，见 {@link detectAnticrawlerCookie}） | 自动解：**纯算** `__ac_signature`，见下 |
 * | `captcha` | `验证码中间页` / `TTGCaptcha` | 只提取不求解，转人工（`../captcha.ts` 第二通道） |
 * | `data` | `_ROUTER_DATA` | 正常页面的水合数据，不是挑战 |
 * | `none` | —— | 认不出。调用方应直接放弃自动处置 |
 *
 * **`vmp` 现在解得开了**：`__ac_signature` 由
 * {@link module:platforms/douyin/sign/acSignature.computeAcSignature} **纯算**产出
 * —— 一段四则运算 + 字符串拼接，不执行挑战页自带的任何代码。本目录刻意不引入任何
 * 脚本执行路径这条**没变**（`node:vm` / `worker_threads` / `eval` / `new Function`
 * 一概没有），变的是「算这个签名不再需要执行路径」。
 *
 * 判序与锚点共现：本仓核过三份 fixture 的锚点分布 —— `slider_captcha.html`
 * （6347B）只有 `TTGCaptcha`×2 与 `验证码中间页`×1；`waf_challenge.html`（2492B）
 * 只有 `_wafchallengeid`、`WAFJS`、`cs="` 各 1；`challenge-page.html`（72914B）只有
 * `_$jsvmprt`×1。**三份样本的锚点完全互斥、没有任何共现**，所以当前判序是安全的。
 *
 * （VMP 那份就是铸造链路用的挑战页：本次移植的参考实现里那份 VMP fixture 与本仓既有的
 * `challenge-page.html` md5 相同、都是 72914 字节，所以共用一份，没有第二张 VMP 页。）
 *
 * 参考实现的注释担心「滑块页同时带 SDK 脚本与中外层 CSS、WAF / VMP 页也可能带
 * SDK 脚本」——那在现有样本上**没有依据**，不是我们的结论；而共现情况我们**也没在
 * 真实流量里验证过**（游客流量撞不到挑战页）。所以特异锚点仍然优先、`TTGCaptcha`
 * 放最后，当纵深防御留着，而不是因为观测到了共现。
 *
 * 宁可漏（返回 `'none'`）也不误判 —— 把来路不明的响应当挑战页硬解，错得比不解更难查。
 *
 * 判据只做**字符串包含**：不解析 HTML 结构、不遍历 DOM、不引入任何 HTML 解析器依赖。
 *
 * @module platforms/douyin/anticrawler/detect
 */

/** 一份响应体命中的反爬形态 */
export type AnticrawlerKind = 'waf' | 'vmp' | 'captcha' | 'data' | 'none'

/**
 * 识别一份响应体的反爬形态。
 * @param html - 响应体原文（不是 HTML 的文本会安全地落到 `'none'`）
 * @returns 识别出的形态；认不出返回 `'none'`
 */
export const detectAnticrawler = (html: string): AnticrawlerKind => {
  if (html.includes('_$jsvmprt')) return 'vmp'
  if (html.includes('_wafchallengeid') || html.includes('WAFJS')) return 'waf'
  if (html.includes('验证码中间页') || html.includes('TTGCaptcha')) return 'captcha'
  if (html.includes('_ROUTER_DATA')) return 'data'
  return 'none'
}

/** VMP 挑战在响应头上的信号：服务端新发的 `__ac_nonce` */
export const AC_NONCE_COOKIE = '__ac_nonce'

/**
 * 从响应头的 `Set-Cookie` 认 VMP 挑战 —— **不碰响应体**。
 *
 * ## 为什么要这条头通道
 *
 * VMP 挑战页约 71KB，而判据只是「服务端新发了 `__ac_nonce`」。响应头通道让识别
 * 与页面形状脱钩：挑战页改版、换模板、甚至压成一行，`__ac_nonce` 这一项不会变 ——
 * 它是解签名真正要的那个输入，服务端不发它就没有挑战可解。
 *
 * ## 2026-10-11 实测：`__ac_nonce` 只在挑战响应上出现
 *
 * ```text
 * GET /            零 cookie        → 200，body 72914 含 _$jsvmprt，Set-Cookie: __ac_nonce ×2
 * GET /            带 nonce+签名    → 200，body 1002417 无 _$jsvmprt，ttwid/UIFID_TEMP/…，无 nonce
 * GET /jingxuan    带访客 cookie    → 200，又是 72914 的挑战页 + __ac_nonce ×2
 * GET /jingxuan    零 cookie        → 同上（nonce 长度 20，不定长）
 * 免签名游客 API   带访客 cookie    → 200 JSON，Set-Cookie 0 条
 * 签名 API（emoji/list，走管线）    → 200 JSON，Set-Cookie 0 条（零 cookie 下也一样）
 * ```
 *
 * 两条结论：**挑战不认 cookie**（带着访客 cookie 照样弹，所以它跟页面走），而
 * **正常页面响应与 API 响应一条 Set-Cookie 都不发**，不存在误判成挑战的余地。
 *
 * ## 判据只能做「包含」，不能解析出值
 *
 * `transport/client.ts` 的 `toAmagiHeaders` 把多条 Set-Cookie 用 `'; '` join 成**一条
 * 字符串**，于是实测那两条同名 nonce 在 `headers.get('set-cookie')` 里长这样：
 *
 * ```text
 * __ac_nonce=<21>; Path=/; Max-Age=1800; Secure; SameSite=None; __ac_nonce=<21>; Path=/; Max-Age=1800
 * ```
 *
 * 属性与下一条的 cookie 名之间只有 `; ` 分隔，**逐条无法还原**。所以这里只判「有没有
 * 这个名字」；真正的 nonce 值由 `solver.ts` 从同一串里按首项取（见那边的说明）。
 * 名字匹配锚在串首或 `; ` 之后，避免把 `foo___ac_nonce=` 这类后缀撞成命中。
 * @param headers - 响应头（`JudgeHeaders` 形状，大小写不敏感）
 * @returns 命中 VMP 时 `'vmp'`，否则 `'none'`
 */
export const detectAnticrawlerCookie = (headers: { get(name: string): string | undefined } | undefined): AnticrawlerKind => {
  const raw = headers?.get('set-cookie')
  if (!raw) return 'none'
  return new RegExp(`(?:^|;\\s*)${AC_NONCE_COOKIE}=`).test(raw) ? 'vmp' : 'none'
}
