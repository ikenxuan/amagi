import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 视频详细信息（单请求）。
 *
 * 与 v6 的 `videoInfo` 一致：`getVideoInfo` GET，无签名。
 */
export const videoInfo = defineEndpoint({
  name: 'bilibili.videoInfo',
  route: '/fetch_one_video',
  params: zod.object({
    bvid: zod.string().min(1, { error: 'BVID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getVideoInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['videoInfo']>()
})
