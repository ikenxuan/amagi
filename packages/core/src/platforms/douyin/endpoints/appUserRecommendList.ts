import zod from 'zod'

import { appRequest, uniqueAppItems } from '../aweme/api'
import { defineAwemeEndpoint, internalParam, type } from '../aweme/define'

export const appUserRecommendList = defineAwemeEndpoint({
  name: 'douyin.appUserRecommendList',
  route: '/app_fetch_user_recommend_list',
  doc: { summary: 'App 用户主页推荐作品列表', description: '实验接口：当前游客身份实测返回用户未登录，正常返回 LOGIN_REQUIRED 错误信封。' },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }).describe('用户 sec_uid'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    max_cursor: internalParam(zod.coerce.number().int().min(0).optional())
  }),
  build: (p) =>
    appRequest(
      '/aweme/v1/familiar/recommend/feed/',
      { sec_user_id: p.sec_uid, max_cursor: p.max_cursor ?? 0, count: p.number ?? 20, from: 1 },
      true
    ),
  partial: 'tolerate',
  paginate: {
    maxPageSize: 20,
    itemKey: 'aweme_id',
    items: (page) => page.aweme_list ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, max_cursor: page.max_cursor }),
    merge: ({ lastPage, items }) => ({ ...lastPage, aweme_list: uniqueAppItems(items, 'aweme_id') })
  },
  response: type<any>()
})
