import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliUploaderTotalViewsResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * UP主总播放量（单请求）。
 *
 * 与旧版一致：`getUploaderTotalViews` GET，无签名。
 */
export const uploaderTotalViews = defineEndpoint({
  name: 'bilibili.uploaderTotalViews',
  route: '/fetch_user_full_view',
  doc: {
    summary: 'UP 主总播放量',
    description:
      '`x/space/upstat`，只回播放与获赞统计（`archive.view` 稿件播放、`article.view` 专栏阅读、`likes` 获赞）。**无签名**，比 `userSpaceInfo` 轻；要等级、签名、VIP 这些完整资料用那条（走 wbi）。'
  },
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' }).describe('UP 主 UID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUploaderTotalViews(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliUploaderTotalViewsResponse>()
})
