import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 直播间信息（单请求 + live Referer 注入）。
 *
 * 与 v6 的 `liveRoomInfo` 一致：`getLiveRoomInfo` GET + a_bogus 签名，
 * Referer 指向 `https://live.douyin.com/{web_rid}`（v6 第七处 Referer
 * 注入，与用户/搜索共用同一 helper）。
 */
export const liveRoomInfo = defineEndpoint({
  name: 'douyin.liveRoomInfo',
  route: '/fetch_user_live_videos',
  params: zod.object({
    web_rid: zod.string().min(1, { error: '直播间ID不能为空' }),
    room_id: zod.string().optional()
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getLiveRoomInfo(p),
    headers: withDouyinReferer(ctx, { kind: 'live', webRid: p.web_rid })
  }),
  sign: 'a-bogus',
  response: type<LiveRoomInfoData>()
})

/** 直播间信息响应（与 v6 形状一致的最小声明） */
export interface LiveRoomInfoData {
  data?: {
    room?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}
