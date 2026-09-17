import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliVideoInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 视频详细信息（单请求）。
 *
 * 与旧版一致：`getVideoInfo` GET，无签名。
 */
export const videoInfo = defineEndpoint({
  name: 'bilibili.videoInfo',
  route: '/fetch_one_video',
  doc: {
    summary: '视频作品详细信息',
    description: '取稿件详情（标题、封面、UP 主、统计、分 P 列表）；返回的 `cid` 供取流与弹幕使用。'
  },
  params: zod.object({
    bvid: zod.string().min(1, { error: 'BVID不能为空' }).describe('稿件 BV 号，如 `BV1xx411c7mD`')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getVideoInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliVideoInfoResponse>()
})
