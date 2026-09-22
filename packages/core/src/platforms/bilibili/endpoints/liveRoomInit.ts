import zod from 'zod'

import type { BilibiliLiveRoomInitResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 直播间初始化信息（单请求）。
 *
 * 与旧版一致：`getLiveRoomInit` GET，无签名。
 */
export const liveRoomInit = defineBilibiliEndpoint({
  name: 'bilibili.liveRoomInit',
  route: '/fetch_liveroom_def',
  doc: {
    summary: '直播间初始化信息',
    description: '取房间的标识与开播状态；标题、封面等展示信息用 `liveRoomInfo`。'
  },
  params: zod.object({
    room_id: zod.string().min(1, { error: '直播间ID不能为空' }).describe('直播间 ID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getLiveRoomInit(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLiveRoomInitResponse>()
})
