import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliVideoStreamResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 视频流信息（qtparam 前置签名）。
 *
 * 与旧版一致：`getVideoStream` GET，签名器是
 * `qtparam`（登录态 → `/nav` 取 vipStatus → wbi 签名 + fnval 档位）。
 */
export const videoStream = defineEndpoint({
  name: 'bilibili.videoStream',
  route: '/fetch_video_playurl',
  doc: {
    summary: '视频下载流信息',
    description:
      '走 `qtparam` 签名：没带 cookie 时降级成 `&platform=html5`；有登录态则先打一次 `/nav` 看 `vipStatus`，VIP 追加 `fnval=4048&fourk=1`、非 VIP 追加 `qn=64&fnval=16`，' +
      'wbi 签名基于**未追加** `fnval` 的原始 URL。所以高清档位取决于调用方的登录 cookie（`/nav` 的 keys 有 30 分钟缓存）。`avid` 不带 `av` 前缀，`cid` 来自 `videoInfo`。'
  },
  params: zod.object({
    avid: zod.coerce.number().int().min(1, { error: 'AVID必须大于等于1' }).describe('稿件 AV 号（纯数字，不带 `av` 前缀）'),
    cid: zod.coerce.number().int().min(1, { error: 'CID必须大于等于1' }).describe('稿件 cid（分 P 的视频流 ID）')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getVideoStream(p) }),
  sign: 'qtparam',
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliVideoStreamResponse>()
})
