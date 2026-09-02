import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 番剧视频流信息（qtparam 前置签名）。
 *
 * 与 v6 的 `bangumiStream` 一致：`getBangumiStream` GET + qtparam 签名，
 * `ep_id` 去掉 `ep` 前缀（与 v6 一致）。
 */
export const bangumiStream = defineEndpoint({
  name: 'bilibili.bangumiStream',
  route: '/fetch_bangumi_video_playurl',
  params: zod.object({
    cid: zod.coerce.number().int().min(1, { error: 'CID必须大于等于1' }),
    ep_id: zod.string().min(1, { error: '番剧EP ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getBangumiStream({ cid: p.cid, ep_id: p.ep_id.replace('ep', '') }) }),
  sign: 'qtparam',
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BangumiStreamData>()
})

/** 番剧视频流响应（与 v6 形状一致的最小声明） */
export interface BangumiStreamData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
