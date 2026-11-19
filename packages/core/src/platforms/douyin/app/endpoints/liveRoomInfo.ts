import zod from 'zod'

import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export const liveRoomInfo = defineAwemeEndpoint({
  name: 'douyin.appLiveRoomInfo',
  route: '/app_fetch_user_live_videos',
  doc: { summary: 'App 直播间详细信息', description: '实验接口：本轮正确主机仍返回空响应；不执行入房 POST，不保证游客读取成功。' },
  params: zod.object({
    room_id: zod.string().min(1, { error: '直播间ID不能为空' }).describe('真实 room_id，不是网页短号 web_rid')
  }),
  build: (p) => appRequest('/webcast/room/info/', { room_id: p.room_id, live_id: 1 }, true, 'https://webcast.amemv.com'),
  response: type<any>()
})
