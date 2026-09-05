import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
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
  doc: { summary: '直播间信息' },
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
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦（#188）
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinReturnTypeMap['liveRoomInfo']>()
})
