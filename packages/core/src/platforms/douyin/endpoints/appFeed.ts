import zod from 'zod'

import type { DouyinAppFeedResponse } from '../../../types/generated'
import { appRequest } from '../aweme/api'
import { defineAwemeEndpoint, type } from '../aweme/define'

export const appFeed = defineAwemeEndpoint({
  name: 'douyin.appFeed',
  route: '/app_fetch_feed',
  doc: { summary: 'App 推荐作品流', description: '无需账号登录；上游实际返回条数可能与 number 不同，单次请求不自动拉取更多页面。' },
  params: zod.object({
    number: zod.coerce.number().int().min(1).max(20).optional().describe('单次请求条数，默认 6')
  }),
  build: (p) => appRequest('/aweme/v1/feed/', { count: p.number ?? 6, type: 0, pull_type: 0 }),
  response: type<DouyinAppFeedResponse>()
})
