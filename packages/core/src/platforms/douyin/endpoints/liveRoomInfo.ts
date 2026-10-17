import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinLiveRoomInfoResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, internalParam, type } from './define'

/**
 * 直播间信息（单请求 + live Referer 注入）。
 *
 * 与旧版一致：`getLiveRoomInfo` GET + a_bogus 签名，
 * Referer 指向 `https://live.douyin.com/{web_rid}`。
 */
export const liveRoomInfo = defineDouyinEndpoint({
  name: 'douyin.liveRoomInfo',
  route: '/fetch_user_live_videos',
  doc: {
    summary: '直播间信息',
    description: '按直播间短号返回开播状态、标题与主播信息。'
  },
  params: zod.object({
    web_rid: zod.string().min(1, { error: '直播间ID不能为空' }).describe('直播间短号（链接里那段）'),
    room_id: internalParam(zod.string().optional().describe('内部透传，一般不用传'))
  }),
  build: (p, ctx): RequestSpec => ({
    method: 'GET',
    url: createDouyinApiUrls(ctx.userAgent).getLiveRoomInfo(p),
    headers: withDouyinReferer(ctx, { kind: 'live', webRid: p.web_rid })
  }),
  sign: douyinBogus(116),
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  response: type<DouyinLiveRoomInfoResponse>()
})
