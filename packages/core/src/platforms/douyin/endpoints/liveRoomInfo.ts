import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinLiveRoomInfoResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 直播间信息（单请求 + live Referer 注入）。
 *
 * 与旧版一致：`getLiveRoomInfo` GET + a_bogus 签名，
 * Referer 指向 `https://live.douyin.com/{web_rid}`。
 */
export const liveRoomInfo = defineEndpoint({
  name: 'douyin.liveRoomInfo',
  route: '/fetch_user_live_videos',
  doc: {
    summary: '直播间信息',
    description:
      '单请求。Referer 自动指向 `https://live.douyin.com/{web_rid}`。`web_rid` 是直播间短号（URL 里那段）；`room_id` 是内部透传参数，一般不用传。'
  },
  params: zod.object({
    web_rid: zod.string().min(1, { error: '直播间ID不能为空' }).describe('直播间短号 `web_rid`（`live.douyin.com/<web_rid>` 里那段）'),
    room_id: zod.string().optional().describe('直播间 `room_id`（内部透传，一般不用传）')
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getLiveRoomInfo(p),
    headers: withDouyinReferer(ctx, { kind: 'live', webRid: p.web_rid })
  }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinLiveRoomInfoResponse>()
})
