import zod from 'zod'

import { kuaishouApiUrls } from '../api'
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, type } from './define'

/**
 * 获取直播间详情（live_api POST）。
 *
 * 走 `live_api/liveroom/livedetail`（纯协议主接口），
 * 返回结构直接包含 `liveStream` / `author` / `gameInfo` / `noticeList` 等。
 * 响应判定用快手 judge（`result=1` 才进 data）。
 *
 * `liveDetail` 里那个 `requiresSign: false` 是 v6 留下的描述位、运行时不读，
 * 真正决定签不签的是下面的 `sign` —— 这条是签的。
 */
export const liveRoomInfo = defineKuaishouEndpoint({
  name: 'kuaishou.liveRoomInfo',
  route: '/fetch_live_room_info',
  doc: {
    summary: '直播间聚合信息',
    description: '取直播间聚合信息（直播流、主播、公告等）；只看直播间时比 `userProfile` 轻。'
  },
  params: zod.object({
    principalId: zod.string().min(1, { error: 'principalId 不能为空' }).describe('用户 ID')
  }),
  sign: [hxfalcon()],
  build: (p) => {
    const req = kuaishouApiUrls.liveDetail(p)
    return { method: 'POST', url: req.url, headers: { 'Content-Type': 'application/json' } }
  },
  response: type<any>()
})
