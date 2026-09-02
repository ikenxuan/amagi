import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { kuaishouApiUrls } from '../api'

/**
 * 获取直播间详情（live_api GET）。
 *
 * v6 的 `liveRoomInfo` 走 `live_api/liveroom/livedetail`（纯协议主接口），
 * 返回结构直接包含 `liveStream` / `author` / `gameInfo` / `noticeList` 等。
 * 响应判定用快手 judge（`result=1` 才进 data）。
 */
export const liveRoomInfo = defineEndpoint({
  name: 'kuaishou.liveRoomInfo',
  route: '/fetch_live_room_info',
  params: zod.object({
    principalId: zod.string().min(1, { error: 'principalId 不能为空' })
  }),
  build: (p) => {
    const req = kuaishouApiUrls.liveDetail(p)
    return { method: 'POST', url: req.url, headers: { 'Content-Type': 'application/json' } }
  },
  response: type<LiveRoomInfoData>()
})

/** 直播间详情响应 */
export interface LiveRoomInfoData {
  data: {
    result: number
    liveStream?: { id?: string; poster?: string; playUrls?: Record<string, unknown> }
    author?: { id?: string; name?: string }
    gameInfo?: { id?: number | string; name?: string }
    config?: Record<string, unknown>
    noticeList?: unknown[]
  }
}
