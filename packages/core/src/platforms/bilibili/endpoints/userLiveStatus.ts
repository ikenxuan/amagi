import zod from 'zod'

import type { BilibiliUserLiveStatusResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 用户直播状态（单请求）。
 *
 * 与旧版一致：`getUserLiveStatus` GET，无签名。
 */
export const userLiveStatus = defineBilibiliEndpoint({
  name: 'bilibili.userLiveStatus',
  route: '/fetch_user_live_status',
  doc: {
    summary: '用户直播状态与直播间基础信息',
    description: '按 UID 查用户的直播状态与直播间信息；已有房间号时用 `liveRoomInfo`。'
  },
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' }).describe('UP 主 UID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUserLiveStatus(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliUserLiveStatusResponse>()
})
