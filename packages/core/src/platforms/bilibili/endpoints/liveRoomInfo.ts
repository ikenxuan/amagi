import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliLiveRoomInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 直播间信息（单请求）。
 *
 * 与旧版一致：`getLiveRoomInfo` GET，无签名。
 */
export const liveRoomInfo = defineEndpoint({
  name: 'bilibili.liveRoomInfo',
  route: '/fetch_live_room_detail',
  doc: {
    summary: '直播间信息',
    description:
      '`room/v1/Room/get_info`，回直播间的展示信息（标题、封面、分区、在线人数、关注数等）。只要房间的标识与状态元信息（真实 `room_id` / 短号 `short_id` / `encrypted`），用 `liveRoomInit`。无签名，`-412` 时退避重试。'
  },
  params: zod.object({
    room_id: zod.string().min(1, { error: '直播间ID不能为空' }).describe('直播间 ID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getLiveRoomInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLiveRoomInfoResponse>()
})
