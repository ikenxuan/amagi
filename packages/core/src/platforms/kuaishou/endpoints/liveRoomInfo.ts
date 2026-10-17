import zod from 'zod'

import { kuaishouApiUrls } from '../api'
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, kuaishouLiveApiJudge, type } from './define'

/**
 * 获取直播间详情（live_api GET）。
 *
 * 走 `live_api/liveroom/livedetail`（纯协议主接口），
 * 返回结构直接包含 `liveStream` / `author` / `gameInfo` / `noticeList` 等。
 *
 * 判定走 {@link kuaishouLiveApiJudge} 而不是平台默认的那个：live_api 的状态位嵌在
 * `data.result`，平台默认 judge 只看顶层，会把 `result=2` 判成成功（见该函数注释）。
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
    return { method: req.method, url: req.url }
  },
  judge: kuaishouLiveApiJudge,
  response: type<any>()
})
