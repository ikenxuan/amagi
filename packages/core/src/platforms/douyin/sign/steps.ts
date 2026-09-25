import type { SignStep } from '../../../contracts/endpoint'
import { withDouyinWebid } from '../webid'
import { douyinSign } from './index'
import { applySecsdkWebSign } from './secsdkWebSign'

/**
 * 抖音反爬参数的原子单元（{@link SignStep}）。
 *
 * 端点用 `sign: [msToken(184), aBogus(), secsdk()]` 直接列出要哪些参数；顺序由每个单元
 * 的 `phase` 决定，端点作者不用手排（详见 {@link SignStep} 与仓库根 `SIGN_REFACTOR_TODO.md`）。
 * 这几个单元合起来等价于旧的 `aBogusSigner` / `xBogusSigner`（它俩内部本就是
 * webid → bogus → secsdk 的复合），只是拆成可增删的原子。
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
 * @param length - `==` 之前的随机段长度
 */
export const msToken = (length: number): SignStep => ({
  phase: 'token',
  apply: (spec) => {
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
