import zod from 'zod'

import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export const search = defineAwemeEndpoint({
  name: 'douyin.appSearch',
  route: '/app_fetch_search_info',
  doc: {
    summary: 'App 搜索结果列表',
    description: '实验接口：当前签名设备的搜索请求仍触发滑块（verify_check），尚无有效成功样本；这不代表官方 App 的游客搜索受同样限制。'
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
      // APK 的 SearchRequestDispatch 为主站搜索补齐这三个内部场景字段。
      token: 'search',
      search_scene: 'douyin_search',
      vlm_config: '1',
      search_channel: p.type === 'user' ? 'aweme_user' : p.type === 'video' ? 'aweme_video' : 'aweme_general'
    }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
  response: type<any>()
})
