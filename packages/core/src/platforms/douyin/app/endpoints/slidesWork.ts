import zod from 'zod'

import type { DouyinAppSlidesWorkResponse } from '../../../../types/generated'
import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export const slidesWork = defineAwemeEndpoint({
  name: 'douyin.appSlidesWork',
  route: '/app_fetch_slides_work',
  doc: { summary: 'App 合辑作品详细信息', description: '返回 App 原始详情；真实样本覆盖图文与视频混合、全部为短片的合辑。' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID')
  }),
  build: (p) => appRequest('/aweme/v1/aweme/detail/', { aweme_id: p.aweme_id, origin_type: 0, request_source: 0 }),
  response: type<DouyinAppSlidesWorkResponse>()
})
