import type { EndpointCtx, SignFn } from '../../../contracts/endpoint'
import type { RequestSpec } from '../../../contracts/request'
import type { WbiNavBody, WbiSigner } from './wbi'

/**
 * B站视频流签名器（qtparam 前置）。
 *
 * cookie 取自 `ctx.cookie`（由 `resolveBoundRequest` 用 `AmagiHeaders`
 * 大小写不敏感地解析），这里不自己翻 headers。
 *
 * 行为：
 * - cookie 为空 → 只带 `&platform=html5`（未登录降级）。
 * - 已登录 → 打 `/nav` 取 `vipStatus`（复用 wbi 签名器的 TTL 缓存）：
 *   VIP 带 `&fnval=4048&fourk=1`，非 VIP 带 `&qn=64&fnval=16`，
 *   再追加 wbi 签名（签名基于**未加 fnval 的原始 URL**）。
 */

/** 高清档位：qn[3] = 64 = 720P */
const QN = [6, 16, 32, 64, 74, 80, 112, 116, 120, 125, 126, 127]

/** VIP 的 fnval：16(DASH) | 64(HDR) | 128(4K) | 256(杜比) | 512(杜比视界) | 1024(8K) | 2048(AV1) = 4048 */
const VIP_FNVAL = 4048

/**
 * 创建 qtparam 签名器。
 *
 * 依赖同一个 {@link WbiSigner} 实例：登录态与 wbi keys 共用一次 `/nav` 的 TTL 缓存。
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

    // 签名基于原始 URL（不含 fnval）
    const signed = await wbi.sign(spec, ctx)

    return { ...spec, url: signed.url + qtParams, extra: { ...spec.extra, isvip } }
  }
}
