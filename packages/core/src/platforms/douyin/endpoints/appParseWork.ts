import zod from 'zod'

import type { DouyinAppParseWorkResponse } from '../../../types/generated'
import { appRequest } from '../aweme/api'
import { defineAwemeEndpoint, type } from '../aweme/define'

export const appParseWork = defineAwemeEndpoint({
  name: 'douyin.appParseWork',
  route: '/app_fetch_one_work',
  doc: { summary: 'App 聚合解析作品数据', description: '无需账号登录，返回 App 原始详情，包含设备签名' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID')
  }),
  build: (p) => appRequest('/aweme/v1/aweme/detail/', { aweme_id: p.aweme_id, origin_type: 0, request_source: 0 }),
  response: type<DouyinAppParseWorkResponse>()
})
