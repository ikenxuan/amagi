import { getCookieValue } from '../../contracts/cookie'
import { genVerifyFp } from './sign/tokens'

/**
 * 抖音设备指纹 `verifyFp` / `fp` 与 cookie 的对齐。
 *
 * 这两个 query 参数与 cookie 里的 `s_v_web_id` 是**同一个值**，不是三个独立的随机串。
 * 2026-09-30 浏览器实测（登录态下打开作品页，读 `performance` 里那条
 * `/aweme/v1/web/aweme/detail/`）：
 *
 * ```text
 * verifyFp === s_v_web_id   true
 * fp       === s_v_web_id   true
 * uifid    === UIFID        true
 * ```
 *
 * 这正是 {@link module:platforms/douyin/webid} 那条注释里说的「设备类参数与 cookie
 * 会话不匹配」，只是换了个参数：抖音对不上时回 HTTP 200 + 空 body，不给 403 也不给
 * 业务码，于是 judge 只能判成 `EMPTY_RESPONSE`。
 *
 * ## 为什么不在 `api.ts` 里拼这两个参数
 *
 * `api.ts` 是同步的 URL 构造，拿不到 `ctx.cookie` —— 它曾经写一个模块级随机常量进去，
 * 于是同一个进程里换几份 cookie 调用，发出去的 `verifyFp` 都是同一个、且和每份 cookie 的
 * `s_v_web_id` 都对不上。把 cookie 穿进 `DouyinAPI` 会让每个 URL 构造方法都染上运行期状态，
 * 所以这两个参数与 `webid` / `uifid` / `msToken` 一起，由签名层按浏览器版式追加 ——
 * 签名层本来就是唯一同时看得到 URL 与 cookie 的地方。
 *
 * ## 两个入口，分工不同
 *
 * - {@link douyinDeviceFpFor}：**取值**。cookie 里有合形状的 `s_v_web_id` 就用它，
 *   否则回落到 {@link DOUYIN_PROCESS_FP}。`/aweme/v1/web/*` 的 tail 由 `sign/steps.ts`
 *   按版式整段追加（`webid,uifid,verifyFp,fp,msToken,a_bogus`），用的是这个函数。
 * - {@link withDouyinDeviceFp}：**原位覆盖**。只改 URL 上已有的 `verifyFp` / `fp`，
 *   键的位置不动。给版式之外的几条用（`iesdouyin` 动图、`live.douyin.com` 直播间、
 *   `sso` 登录码），它们的 query 不是三段式、也不该被重排。
 *
 * @module platforms/douyin/deviceFp
 */

/**
 * `s_v_web_id` / `verify_fp` 的形状：`verify_<36 进制时间戳>_<36 位尾巴>`。
 *
 * 判据与 `sign/decode.ts` 的 {@link identify} 同源。不合形状的值一律不用 ——
 * 传错比不传更糟，这一点与 webid 相同。
 */
const DEVICE_FP_SHAPE = /^verify_[0-9a-z]+_[0-9a-zA-Z_]+$/

/**
 * 进程级兜底指纹：cookie 里没有 `s_v_web_id` 时发这个。
 *
 * 不发比发错好 —— 这条原则对 `webid` 成立（服务端算得出真值，对不上就拒），对
 * `verifyFp` 却不成立：它是**客户端自己生成**的设备 id，浏览器首访时也是本地抽一个、
 * 再由服务端 `Set-Cookie` 回 `s_v_web_id` 固化。所以缺这两个键反而不像真实浏览器。
 *
 * 取模块级常量而非每次重抽：同一进程的多次请求表现为同一台设备，与浏览器一致。
 */
export const DOUYIN_PROCESS_FP = genVerifyFp()

/**
 * 取本次请求该用的 `verifyFp` / `fp` 值。
 *
 * cookie 里有合 {@link DEVICE_FP_SHAPE} 的 `s_v_web_id` 就照抄（浏览器里这三个值恒等），
 * 否则回落到 {@link DOUYIN_PROCESS_FP}。
 * @param cookie - 本次请求使用的 cookie
 * @returns 设备指纹值，恒非空
 */
export const douyinDeviceFpFor = (cookie?: string | null): string => {
  const svWebId = cookie ? (getCookieValue(cookie, 's_v_web_id') ?? '') : ''
  return svWebId && DEVICE_FP_SHAPE.test(svWebId) ? svWebId : DOUYIN_PROCESS_FP
}

/**
 * 用 cookie 里的 `s_v_web_id` 覆盖 URL 上的 `verifyFp` / `fp`。
 *
 * **必须在算 a_bogus / x_bogus 之前调用**：真实浏览器的顺序是「拼好 query（含
 * verifyFp / fp）→ a_bogus → secsdk 签名」，后两者都覆盖 query，顺序错了签名就不成立。
 *
 * 下面三种情况原样返回：
 * - cookie 里没有 `s_v_web_id`（游客调用、或调用方给的 cookie 不全）；
 * - 值不合 {@link DEVICE_FP_SHAPE}；
 * - URL 上本来就没有 `verifyFp` / `fp`。
 *
 * 覆盖而非「有则不动」：URL 上那两个值来自 {@link DOUYIN_PROCESS_FP}，
 * 留着它就等于继续发一个与本次 cookie 无关的指纹。
 *
 * `/aweme/v1/web/*` 不走这条 —— 那边由 `sign/steps.ts` 按浏览器版式整段追加 tail，
 * 用 {@link douyinDeviceFpFor} 取值。这里服务的是版式之外的三条（`iesdouyin` 动图、
 * `live.douyin.com` 直播间、`sso` 登录码），它们的键序不该被重排。
 * @param url - 还没加签的 URL
 * @param cookie - 本次请求使用的 cookie
 * @returns 对齐后的 URL
 */
export const withDouyinDeviceFp = (url: string, cookie?: string | null): string => {
  const svWebId = cookie ? (getCookieValue(cookie, 's_v_web_id') ?? '') : ''
  if (!svWebId || !DEVICE_FP_SHAPE.test(svWebId)) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url // 不是绝对 URL，交给签名器的前置校验去报错
  }
  let touched = false
  for (const key of ['verifyFp', 'fp'] as const) {
    if (!parsed.searchParams.has(key) || parsed.searchParams.get(key) === svWebId) continue
    parsed.searchParams.set(key, svWebId)
    touched = true
  }
  return touched ? parsed.toString() : url
}
