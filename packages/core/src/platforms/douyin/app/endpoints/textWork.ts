import zod from 'zod'

import type { DouyinAppTextWorkResponse } from '../../../../types/generated'
import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export const textWork = defineAwemeEndpoint({
  name: 'douyin.appTextWork',
  route: '/app_fetch_text_work',
  doc: { summary: 'App 文字作品详细信息', description: '返回 App 原始文字作品详情，响应类型由 aweme_type=163 的真实样本生成。' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID')
  }),
  build: (p) => appRequest('/aweme/v1/aweme/detail/', { aweme_id: p.aweme_id, origin_type: 0, request_source: 0 }),
  response: type<DouyinAppTextWorkResponse>()
})
