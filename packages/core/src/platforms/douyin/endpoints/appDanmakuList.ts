import zod from 'zod'

import type { DouyinAppDanmakuListResponse } from '../../../types/generated'
import { appRequest } from '../aweme/api'
import { defineAwemeEndpoint, type } from '../aweme/define'

export const appDanmakuList = defineAwemeEndpoint({
  name: 'douyin.appDanmakuList',
  route: '/app_fetch_work_danmaku',
  doc: { summary: 'App 作品弹幕片段', description: '返回指定起点的 App 弹幕片段；total 不等于本次条数，不承诺全片弹幕已取全。' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID'),
    duration: zod.coerce.number().int().min(1).describe('视频总时长（毫秒），取作品详情 video.duration'),
    start_time: zod.coerce.number().int().min(0).optional().describe('片段起点（毫秒），默认 0')
  }),
  build: (p) =>
    appRequest('/aweme/v1/danmaku/get_v2/', {
      item_id: p.aweme_id,
      duration: p.duration,
      start_time: p.start_time ?? 0,
      has_total: 0,
      total: 0,
      danmaku_density: 3
    }),
  response: type<DouyinAppDanmakuListResponse>()
})
