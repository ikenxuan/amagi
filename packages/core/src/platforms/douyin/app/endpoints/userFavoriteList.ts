import zod from 'zod'

import { appRequest, uniqueAppItems } from '../api'
import { defineAwemeEndpoint, internalParam, type } from '../define'

export const userFavoriteList = defineAwemeEndpoint({
  name: 'douyin.appUserFavoriteList',
  route: '/app_fetch_user_favorite_list',
  doc: {
    summary: 'App 用户主页点赞作品列表',
    description: '实验接口：公开喜欢列表的游客请求触发文字验证码，返回 CAPTCHA_REQUIRED，尚无有效成功样本。'
  },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }).describe('用户 sec_uid'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    max_cursor: internalParam(zod.coerce.number().int().min(0).optional())
  }),
  build: (p) =>
    appRequest(
      '/aweme/v1/aweme/favorite/',
      { sec_user_id: p.sec_uid, max_cursor: p.max_cursor ?? 0, count: p.number ?? 20, source: 0, page_scene: 0 },
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
