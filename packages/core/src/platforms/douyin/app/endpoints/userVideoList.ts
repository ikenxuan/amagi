import zod from 'zod'

import type { DouyinAppUserVideoListResponse } from '../../../../types/generated'
import { appRequest, uniqueAppItems } from '../api'
import { defineAwemeEndpoint, internalParam, type } from '../define'

export const userVideoList = defineAwemeEndpoint({
  name: 'douyin.appUserVideoList',
  route: '/app_fetch_user_post_videos',
  doc: { summary: 'App 用户主页作品列表', description: '公开主页可游客读取，私密内容受平台权限限制。' },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }).describe('用户 sec_uid'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    max_cursor: internalParam(zod.coerce.number().int().min(0).optional())
  }),
  build: (p) =>
    appRequest(
      '/aweme/v1/aweme/post/',
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
  response: type<DouyinAppUserVideoListResponse>()
})
