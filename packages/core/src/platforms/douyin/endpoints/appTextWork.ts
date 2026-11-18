import zod from 'zod'

import { appRequest } from '../aweme/api'
import { defineAwemeEndpoint, type } from '../aweme/define'

export const appTextWork = defineAwemeEndpoint({
  name: 'douyin.appTextWork',
  route: '/app_fetch_text_work',
  doc: { summary: 'App 文字作品详细信息', description: '共用 App 详情上游；该媒体形态尚未取得独立成功样本。' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID')
  }),
  build: (p) => appRequest('/aweme/v1/aweme/detail/', { aweme_id: p.aweme_id, origin_type: 0, request_source: 0 }),
  response: type<any>()
})
