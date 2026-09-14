import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliUserLiveStatusResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 用户直播状态（单请求）。
 *
 * 与旧版一致：`getUserLiveStatus` GET，无签名。
 */
export const userLiveStatus = defineEndpoint({
  name: 'bilibili.userLiveStatus',
  route: '/fetch_user_live_status',
  doc: {
    summary: '用户直播状态与直播间基础信息',
    description:
      '`room/v1/Room/getRoomInfoOld`，**按 UID 查**：回 `liveStatus` / `roomid` / 标题 / 封面 / 在线人数，不传房间号。手里是 `room_id` 而不是 UID 时改用 `liveRoomInfo` 或 `liveRoomInit`。无签名。'
  },
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' }).describe('UP 主 UID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUserLiveStatus(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliUserLiveStatusResponse>()
})
