import type { EndpointCtx, SignFn } from '../../../contracts/endpoint'
import type { RequestSpec } from '../../../contracts/request'
import type { WbiNavBody, WbiSigner } from './wbi'

/**
 * B站视频流签名器（qtparam 前置）。
 *
 * 从 v6 `platform/bilibili/qtparam.ts` 搬迁，修掉 cookie 大小写问题：
 * v6 的 `qtparam(baseUrl, baseRequestConfig.headers?.Cookie)` 只认大写
 * `Cookie`，而 `wbi_sign` 那一路取的是小写 `cookie` —— 一处大写一处小写，
 * 后者恒 `undefined`。v7 的 `ctx.cookie` 由 `resolveBoundRequest` 用
 * `AmagiHeaders` 大小写不敏感地解析（`videoStream` / `bangumiStream`
 * 两处都拿得到），这里不再自己翻 headers。
 *
 * 行为与 v6 一致：
 * - cookie 为空 → 只带 `&platform=html5`（未登录降级）。
 * - 已登录 → 打 `/nav` 取 `vipStatus`（复用 wbi 签名器的 TTL 缓存）：
 *   VIP 带 `&fnval=4048&fourk=1`，非 VIP 带 `&qn=64&fnval=16`，
 *   再追加 wbi 签名（签名基于**未加 fnval 的原始 URL**，与 v6 相同）。
 */

/** 高清档位（v6 逐字保留）：qn[3] = 64 = 720P */
const QN = [6, 16, 32, 64, 74, 80, 112, 116, 120, 125, 126, 127]

/** VIP 的 fnval：16(DASH) | 64(HDR) | 128(4K) | 256(杜比) | 512(杜比视界) | 1024(8K) | 2048(AV1) = 4048 */
const VIP_FNVAL = 4048

/**
 * 创建 qtparam 签名器。
 *
 * 依赖同一个 {@link WbiSigner} 实例：v6 里 qtparam 自己打一次 `/nav` 取
 * 登录态、wbi_sign 再打一次取 keys（同一个接口打两次）；v7 共用实例缓存，
 * 一次 `/nav` 两用（修 #4）。
 * @param wbi - wbi 签名器实例（与 `sign: 'wbi'` 的端点共用）
 * @returns 签名器函数，挂到 `sign: 'qtparam'`
 */
export const createQtparamSigner = (wbi: WbiSigner): SignFn => {
  return async (spec: RequestSpec, ctx: EndpointCtx): Promise<RequestSpec> => {
    if (ctx.cookie === '') {
      return { ...spec, url: spec.url + '&platform=html5' }
    }

    const nav: WbiNavBody = await wbi.getNav(ctx)
    const isvip = nav.data?.vipStatus === 1
    const qtParams = isvip ? `&fnval=${VIP_FNVAL}&fourk=1` : `&qn=${QN[3]}&fnval=16`

    // 签名基于原始 URL（不含 fnval），与 v6 的 wbi_sign(BASEURL) 一致
    const signed = await wbi.sign(spec, ctx)

    return { ...spec, url: signed.url + qtParams, extra: { ...spec.extra, isvip } }
  }
}
