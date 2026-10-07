import zod from 'zod'

import { getCookieValue } from '../../../contracts/cookie'
import type { XiaohongshuLiveRoomResponse } from '../../../types/generated'
import { liveRoom as buildLiveRoom } from '../api'
import { guestFallbackPrepare } from '../guestPrepare'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 直播间信息（GET），移植自 v6：`live-room.xiaohongshu.com`。
 *
 * `variant` 选择 h5 或 web（默认）。响应只声明有现有证据支撑的字段，
 * 未记录的结构保持 unknown。
 */
export const liveRoom = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.liveRoom',
  route: '/fetch_live_room',
  doc: {
    summary: '直播间信息',
    description: '取指定直播间的当前信息。variant=h5 走 h5 接口，否则走 web；web 端请提供 request_user_id 或含 userId 的 Cookie。'
  },
  params: zod.object({
    room_id: zod.string().min(1, { error: 'room_id 不能为空' }).describe('直播间 ID'),
    variant: zod.enum(['h5', 'web']).optional().describe('端类型，默认 web'),
    request_user_id: zod.string().min(1).optional().describe('请求方用户 ID；web 默认从 Cookie 的 userId 读取，h5 不使用'),
    source: zod.string().optional().describe('来源标识，默认按端类型取（web=web_live）'),
    client_type: zod.coerce.number().int().min(1).optional().describe('客户端类型，web 端默认 1')
  }),
  prepare: guestFallbackPrepare,
  build: (p, ctx) => {
    const { Url, apiPath, signParams } = buildLiveRoom({ ...p, request_user_id: p.request_user_id ?? getCookieValue(ctx.cookie, 'userId') })
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  sign: 'xhs-live-get',
  response: type<XiaohongshuLiveRoomResponse>()
})
