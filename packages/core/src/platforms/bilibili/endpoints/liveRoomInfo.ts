import zod from 'zod'

import type { BilibiliLiveRoomInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 直播间信息（单请求）。
 *
 * 与旧版一致：`getLiveRoomInfo` GET，无签名。
 */
export const liveRoomInfo = defineBilibiliEndpoint({
  name: 'bilibili.liveRoomInfo',
  route: '/fetch_live_room_detail',
  doc: {
    summary: '直播间信息',
    description: '取直播间的展示信息（标题、封面、分区等）；房间标识与开播状态用 `liveRoomInit`。'
  },
  params: zod.object({
    room_id: zod.string().min(1, { error: '直播间ID不能为空' }).describe('直播间 ID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getLiveRoomInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLiveRoomInfoResponse>()
})
