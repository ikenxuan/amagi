import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 直播间信息（单请求）。
 *
 * 与 v6 的 `liveRoomInfo` 一致：`getLiveRoomInfo` GET，无签名。
 */
export const liveRoomInfo = defineEndpoint({
  name: 'bilibili.liveRoomInfo',
  route: '/fetch_live_room_detail',
  params: zod.object({
    room_id: zod.string().min(1, { error: '直播间ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getLiveRoomInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<LiveRoomInfoData>()
})

/** 直播间信息响应（与 v6 形状一致的最小声明） */
export interface LiveRoomInfoData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
