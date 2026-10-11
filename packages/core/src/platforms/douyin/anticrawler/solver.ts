import { parseCookie, serializeCookie } from '../../../contracts/cookie'
import { computeAcSignature, DEFAULT_HREF } from '../sign/acSignature'
import { rememberDouyinAcNonce } from './acNonce'
import { AC_NONCE_COOKIE, detectAnticrawler, detectAnticrawlerCookie } from './detect'
import { solveWafChallenge, WAF_CHALLENGE_COOKIE } from './waf'

/**
 * 抖音反爬挑战的自动解算编排（装在 `PLATFORM_RUNTIME.douyin.solveChallenge` 上）。
 *
 * **两种形态会被自动解：WAF 工作量证明与 acrawler VMP。** 三条通道的处置是刻意分开的：
 *
 * | 形态 | 这里的处置 | 理由 |
 * | --- | --- | --- |
 * | `waf` | 自动解 + 由管线立即重放 | 纯 sha256 计算，不含任何人机判定（见 `./waf.ts`） |
 * | `vmp` | 自动解 + 由管线立即重放 | `__ac_signature` **纯算**，不执行挑战页代码，见下 |
 * | `captcha` | **永不解**，返回 `undefined` | 真人滑块。自动重放毫无意义，还会放大风控 |
 * | `data` / `none` | 不是挑战，返回 `undefined` | —— |
 *
 * **`vmp` 怎么解**：签名由
 * {@link module:platforms/douyin/sign/acSignature.computeAcSignature} 纯算 —— 四则
 * 运算加字符串拼接，**不执行挑战页自带的任何代码**。本模块「不引入任何脚本执行路径」
 * （`node:vm`、`worker_threads`、`eval`、`new Function` 一概没有）这条**没变**。
 *
 * **判序刻意是「响应体特异锚点优先、`__ac_nonce` 兜底」**，不是「头优先」：
 * WAF 页与滑块页都有自己的唯一锚点，而「服务端发了 `__ac_nonce`」这个信号单独看
 * 不排除同一响应也是 WAF / 滑块页（实测三份 fixture 锚点互斥，但那是三个样本，
 * 不是保证）。先认特异锚点，就不会把一张恰好也发了 nonce 的 WAF 页解成 VMP、
 * 更不会把滑块页解成 VMP —— **滑块永不自动解这条红线因此仍然成立**。
 *
 * 返回值是**合并好的完整 cookie 串**（在入参 cookie 之上叠加解出的那一段），
 * 调用方 `ctx.cookie = 返回值` 后直接重放，不需要理解 cookie 语义。
 *
 * 线上触发情况：WAF / 滑块两条通道**我们没有线上命中记录**（主 agent 实测游客流量
 * 240 发跨 5 条端点一次验证挑战都没撞到，要撞得上登录态 cookie），验证停在 fixture 级。
 * VMP 这条**有实测**：零 cookie 打首页必弹，判据与 cookie 形态见 `./detect.ts` 的
 * {@link detectAnticrawlerCookie}。
 *
 * @module platforms/douyin/anticrawler/solver
 */

/** 解算需要的现场信息 */
export interface DouyinSolverContext {
  /** 当前完整 cookie 串；解出的段在它之上合并 */
  cookie: string
  /** 本次请求的 UA。VMP 签名把它摘进去，必须与重放请求发出的那串一致 */
  userAgent?: string
  /** 响应头（`JudgeHeaders` 形状）。VMP 的 nonce 只在这里 */
  headers?: { get(name: string): string | undefined }
}

/**
 * 从 join 过的 `Set-Cookie` 串里取 `__ac_nonce` 的值。
 *
 * 多条 Set-Cookie 被 `'; '` join 成一条（见 `detect.ts` 的说明），实测服务端还会把
 * 同一个 nonce **发两遍**。所以这里按「首个 `__ac_nonce=` 之后、下一个 `;` 之前」取 ——
 * 两条同名的值相同，取谁都一样；取首项是为了与浏览器「后写覆盖前写」之外最朴素的
 * 那种读法一致，不需要理解 join 之后的边界。
 * @param raw - `headers.get('set-cookie')` 的原串
 * @returns nonce 值；取不到时 `undefined`
 */
const acNonceFrom = (raw: string): string | undefined => {
  const match = new RegExp(`(?:^|;\\s*)${AC_NONCE_COOKIE}=([^;]*)`).exec(raw)
  const value = match?.[1]?.trim()
  return value ? value : undefined
}

/**
 * 自动解算抖音反爬挑战，返回可直接替换 `ctx.cookie` 的完整 cookie 串。
 * @param decoded - decode 之后的响应体（挑战页是 HTML 字符串；VMP 可以不给）
 * @param ctx - 解算现场
 * @returns 合并好的 cookie 串；该形态不自动解算或解算失败时 `undefined`
 */
export const solveDouyinAnticrawler = (decoded: unknown, ctx: DouyinSolverContext): string | undefined => {
  const body = typeof decoded === 'string' ? decoded : ''
  // 响应体的特异锚点先判：WAF 与滑块各有唯一锚点，认它们不会与 nonce 信号打架
  const bodyKind = body === '' ? 'none' : detectAnticrawler(body)
  if (bodyKind === 'captcha') return undefined // 红线：滑块只能由真人拖

  if (bodyKind === 'waf') {
    const value = solveWafChallenge(body)
    if (value === undefined) return undefined
    // 同名后写覆盖：挑战页的 Max-Age=1 本就表示「这一段只为这一次重放服务」
    return serializeCookie({ ...parseCookie(ctx.cookie), [WAF_CHALLENGE_COOKIE]: value })
  }

  // VMP：响应体锚点或响应头的 __ac_nonce，命中其一即可
  if (bodyKind !== 'vmp' && detectAnticrawlerCookie(ctx.headers) !== 'vmp') return undefined

  // nonce 只在响应头上，响应体里没有 —— 没有它就算不出签名
  const raw = ctx.headers?.get('set-cookie')
  const nonce = raw ? acNonceFrom(raw) : undefined
  if (!nonce || !ctx.userAgent) return undefined

  let signature: string
  try {
    // href 取 `sign/acSignature.ts` 的默认值，**实测服务端不校验这一段**：2026-10-11
    // 在非根路径上对照（零 cookie 打 `/jingxuan` 拿 nonce，签完重发 `/jingxuan`，看
    // 第二发有没有 `ttwid` + `UIFID_TEMP`）——
    //
    //   根 href   https://www.douyin.com/（本处）   3/3 过
    //   现场 href https://www.douyin.com/jingxuan   3/3 过
    //   他域 href https://www.example.com/zz        3/3 过
    //   负向对照：签的是另一个 nonce（形状合法）     被拒，回滑块页
    //
    // 换了域名照样过、配错 nonce 立刻被拒：签名是验的，href 那段不影响放行，所以不为它
    // 扩契约（`ChallengeSolver` 不透传 `RawResponse.url`）。这是观测到的服务端行为，
    // 不是协议保证 —— 哪天开始校验，表现会是非根路径上解完重放仍被挡。
    // 发送前预置（`./acNonce.ts`）引的是同一个常量：两处算的是同一份签名。
    signature = computeAcSignature(nonce, ctx.userAgent, Date.now(), { href: DEFAULT_HREF })
  } catch {
    // 入参不合法（空 nonce / 空 UA）。解不出就按原样交出失败信封，不吞错
    return undefined
  }

  // 记下 nonce，好让**下一次调用**在发送前就把这对带上、不再撞一次挑战。
  // 记的是挨挑战这一发的 cookie（不是下面合并后的那份）：下一次调用手里就是它。
  // 签名不缓存 —— 它按当刻整秒算，缓存只会拿到过期的一份（见 ./acNonce.ts 的模块头）
  rememberDouyinAcNonce(ctx.cookie, nonce)

  // 两项都要带：服务端按 pair 校验，少任何一个都等于没过挑战
  return serializeCookie({ ...parseCookie(ctx.cookie), [AC_NONCE_COOKIE]: nonce, __ac_signature: signature })
}
