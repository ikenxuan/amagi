import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliLiveRoomInitResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 直播间初始化信息（单请求）。
 *
 * 与旧版一致：`getLiveRoomInit` GET，无签名。
 */
export const liveRoomInit = defineEndpoint({
  name: 'bilibili.liveRoomInit',
  route: '/fetch_liveroom_def',
  doc: {
    summary: '直播间初始化信息',
    description:
      '`room/v1/Room/room_init`，只回房间的标识与状态（`room_id` / `short_id` / `uid` / `live_status` / `encrypted` 等），没有标题、封面、分区这些展示字段 —— 那些用 `liveRoomInfo`。无签名，`-412` 时退避重试。'
  },
  params: zod.object({
    room_id: zod.string().min(1, { error: '直播间ID不能为空' }).describe('直播间 ID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getLiveRoomInit(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLiveRoomInitResponse>()
})
