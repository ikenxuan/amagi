import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 视频流信息（qtparam 前置签名）。
 *
 * 与 v6 的 `videoStream` 一致：`getVideoStream` GET，签名器是
 * `qtparam`（登录态 → `/nav` 取 vipStatus → wbi 签名 + fnval 档位）。
 */
export const videoStream = defineEndpoint({
  name: 'bilibili.videoStream',
  route: '/fetch_video_playurl',
  params: zod.object({
    avid: zod.coerce.number().int().min(1, { error: 'AVID必须大于等于1' }),
    cid: zod.coerce.number().int().min(1, { error: 'CID必须大于等于1' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getVideoStream(p) }),
  sign: 'qtparam',
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<VideoStreamData>()
})

/** 视频流响应（与 v6 形状一致的最小声明） */
export interface VideoStreamData {
  code?: number
  data?: {
    quality?: number
    durl?: unknown[]
    dash?: Record<string, unknown>
    [key: string]: unknown
  }
  message?: string
  [key: string]: unknown
}
