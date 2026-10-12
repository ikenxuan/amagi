import zod from 'zod'

import type { XiaohongshuLiveStatusResponse } from '../../../types/generated'
import { liveStatus as buildLiveStatus } from '../api'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 直播状态（GET，h5），移植自 v6。
 *
 * 响应只有三个字段、体积很小，适合轮询。只声明有现有证据支撑的字段，
 * 未记录的结构保持 unknown。
 */
export const liveStatus = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.liveStatus',
  route: '/fetch_live_status',
  doc: {
    summary: '直播状态',
    description: '轮询指定直播间是否在播，返回体极小。'
  },
  params: zod.object({
    room_id: zod.string().min(1, { error: 'room_id 不能为空' }).describe('直播间 ID'),
    scene: zod.string().optional().describe('场景标识，默认 share_out_of_app')
  }),
  build: (p) => {
    const { Url, apiPath, signParams } = buildLiveStatus(p)
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  sign: 'xhs-live-get',
  response: type<XiaohongshuLiveStatusResponse>()
})
