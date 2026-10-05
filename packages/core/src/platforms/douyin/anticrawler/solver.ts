/**
 * 抖音 Argus 反爬的自动解算编排。
 *
 * 三层防线的处置策略（2026-10 实测）：
 *
 * | 形态 | 判定锚点 | 处置 |
 * | --- | --- | --- |
 * | WAF PoW | `_wafchallengeid` | 纯程序化：毫秒级暴搜 sha256 |
 * | acrawler VMP | `_$jsvmprt` | 纯程序化：node:vm 跑挑战页脚本 |
 * | TTGCaptcha 滑块 | `验证码中间页` / `TTGCaptcha` | **转人工**：这里给不出路，返回 undefined |
 *
 * WAF 与 VMP 都是「匿名挑战」，给一份有限的浏览器指纹就能自己过；
 * 滑块夹带会话票据，只能交给真人。所以 {@link solveDouyinAnticrawler}
 * 只在两种纯程序化形态上真正动手，其余形态一律返回 `undefined`
 * （调用方走 `error.challenge` 那条中转路径）。
 *
 * 返回值是**合并好完整 cookie 串**（在入参 cookie 之上叠加新增段），
 * 调用方 `ctx.cookie = 返回值` 后直接重放即可，不需要理解 cookie 语义。
 */

import { parseCookie, serializeCookie } from '../../../contracts/cookie'
import { solveAcrawlerVmp } from './acrawler'
import { detectAnticrawler } from './detect'
import { solveWafChallenge } from './waf'

/** 解算需要的现场信息（a3 在 execute 层组装） */
export interface DouyinSolverContext {
  /** 触发挑战的请求地址（VMP 沙箱的 location / 页面地址） */
  url: string
  /** 当前完整 cookie 串（解算后的结果在此基础上合并） */
  cookie: string
  /** 请求 UA —— 必须与导致挑战的请求一致，VMP 指纹与签名强相关 */
  userAgent: string
  /** VMP 沙箱的 document.referrer；缺省用抖音首页 */
  referrer?: string
  /** 挑战响应的 Set-Cookie 头（VMP 的 `__ac_nonce` 从这里下发） */
  setCookie?: string[]
}

/**
 * 从挑战响应的 Set-Cookie / 现有 cookie 里取出 VMP 需要的 `__ac_nonce`。
 *
 * `__ac_nonce` 是挑战页 set-cookie 下发的，先进 `ctx.setCookie`；个别场景
 * （如多次重放后 nonce 已进 cookie）兜底从 `ctx.cookie` 里找。
 */
const nonceFrom = (ctx: DouyinSolverContext): string | undefined => {
  for (const header of ctx.setCookie ?? []) {
    const nonce = parseCookie(header)['__ac_nonce']
    if (nonce !== undefined) return nonce
  }
  return parseCookie(ctx.cookie)['__ac_nonce']
}

/**
 * 自动解算抖音反爬挑战，返回可直接替换 `ctx.cookie` 的完整 cookie 串。
 *
 * @param decoded - decode 之后的响应体（挑战页是 HTML 字符串）
 * @param ctx - 解算现场
 * @returns 合并好的 cookie 串；该形态无法自动解算（滑块）或解算失败返回 `undefined`
 */
export const solveDouyinAnticrawler = (decoded: unknown, ctx: DouyinSolverContext): string | undefined => {
  if (typeof decoded !== 'string' || decoded === '') return undefined

  const kind = detectAnticrawler(decoded)

  // WAF PoW：解出 `_wafchallengeid`，合并进现有 cookie 后重放即可
  if (kind === 'waf') {
    const segment = solveWafChallenge(decoded)
    if (!segment) return undefined
    return serializeCookie({ ...parseCookie(ctx.cookie), ...parseCookie(segment) })
  }

  // acrawler VMP：需要 nonce；解出 `__ac_signature`（可能带 `__ac_referer`）
  if (kind === 'vmp') {
    const nonce = nonceFrom(ctx)
    if (!nonce) return undefined
    const result = solveAcrawlerVmp(decoded, nonce, {
      userAgent: ctx.userAgent,
      pageUrl: ctx.url,
      referrer: ctx.referrer ?? 'https://www.douyin.com/'
    })
    if (!result.signature) return undefined
    const added = serializeCookie({
      ...(result.signature ? { __ac_signature: result.signature } : {}),
      ...(result.referer ? { __ac_referer: result.referer } : {})
    })
    return serializeCookie({ ...parseCookie(ctx.cookie), ...parseCookie(added) })
  }

  // captcha（转人工）/ data / none：自动解算不负责
  return undefined
}
