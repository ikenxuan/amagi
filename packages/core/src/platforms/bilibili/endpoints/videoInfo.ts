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
    description:
      '`x/web-interface/view`：稿件详情（标题、封面、UP 主、统计、简介、分 P 列表 `pages`）。`data.cid` 是默认分 P 的视频流 ID，多 P 时逐条取 `pages[].cid`，' +
      '给 `videoStream` 取流、给 `videoDanmaku` 取弹幕都要它。无签名。'
  },
  params: zod.object({
    bvid: zod.string().min(1, { error: 'BVID不能为空' }).describe('稿件 BV 号，如 `BV1xx411c7mD`')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getVideoInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliVideoInfoResponse>()
})
