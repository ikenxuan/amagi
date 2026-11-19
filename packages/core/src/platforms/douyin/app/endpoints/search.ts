import zod from 'zod'

import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export const search = defineAwemeEndpoint({
  name: 'douyin.appSearch',
  route: '/app_fetch_search_info',
  doc: {
    summary: 'App 搜索结果列表',
    description: '实验接口：实测可能返回风控或验证提示；这些响应作为失败信封返回，不把空结果当成成功取数。'
  },
  params: zod.object({
    query: zod.string().min(1, { error: '搜索词不能为空' }).describe('搜索关键词'),
    type: zod.enum(['general', 'user', 'video']).optional().describe('搜索类型，默认综合'),
    number: zod.coerce.number().int().min(1).max(20).optional().describe('单页条数，默认 10')
  }),
  build: (p) => ({
    ...appRequest(
      p.type === 'user' ? '/aweme/v1/discover/search/' : p.type === 'video' ? '/aweme/v1/search/item/' : '/aweme/v1/general/search/single/'
    ),
    method: 'POST' as const,
    body: new URLSearchParams({
      keyword: p.query,
      count: String(p.number ?? 10),
      offset: '0',
      type: '1',
      search_source: 'normal_search',
      query_correct_type: '1',
      is_filter_search: '0',
      search_channel: p.type === 'user' ? 'aweme_user' : p.type === 'video' ? 'aweme_video' : 'aweme_general'
    }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
  response: type<any>()
})
