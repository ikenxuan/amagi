import zod from 'zod'

import type { DouyinAppCommentsResponse } from '../../../../types/generated'
import { appRequest, uniqueAppItems } from '../api'
import { defineAwemeEndpoint, internalParam, type } from '../define'

export const comments = defineAwemeEndpoint({
  name: 'douyin.appComments',
  route: '/app_fetch_work_comments',
  doc: { summary: 'App 作品评论列表', description: '无需账号登录；内部使用 cursor 翻页并按 cid 去重，默认目标 20 条。' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    cursor: internalParam(zod.coerce.number().int().min(0).optional())
  }),
  build: (p) => appRequest('/aweme/v2/comment/list/', { aweme_id: p.aweme_id, cursor: p.cursor ?? 0, count: p.number ?? 20 }),
  partial: 'tolerate',
  paginate: {
    maxPageSize: 20,
    itemKey: 'cid',
    items: (page) => page.comments ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: page.cursor }),
    merge: ({ lastPage, items }) => ({ ...lastPage, comments: uniqueAppItems(items, 'cid') })
  },
  response: type<DouyinAppCommentsResponse>()
})
