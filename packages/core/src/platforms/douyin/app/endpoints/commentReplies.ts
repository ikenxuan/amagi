import zod from 'zod'

import type { DouyinAppCommentRepliesResponse } from '../../../../types/generated'
import { appRequest, uniqueAppItems } from '../api'
import { defineAwemeEndpoint, internalParam, type } from '../define'

export const commentReplies = defineAwemeEndpoint({
  name: 'douyin.appCommentReplies',
  route: '/app_fetch_video_comment_replies',
  doc: { summary: 'App 指定评论的回复列表', description: '使用 douyin.app.signerBaseUrl 配置的签名服务；设备与环境参数由内部处理。' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID'),
    comment_id: zod.string().min(1, { error: '评论ID不能为空' }).describe('一级评论 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    cursor: internalParam(zod.coerce.number().int().min(0).optional())
  }),
  build: (p) =>
    appRequest('/aweme/v1/comment/list/reply/', {
      item_id: p.aweme_id,
      comment_id: p.comment_id,
      cursor: p.cursor ?? 0,
      count: p.number ?? 20
    }),
  partial: 'tolerate',
  paginate: {
    maxPageSize: 20,
    itemKey: 'cid',
    items: (page) => page.comments ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: page.cursor }),
    merge: ({ lastPage, items }) => ({ ...lastPage, comments: uniqueAppItems(items, 'cid') })
  },
  response: type<DouyinAppCommentRepliesResponse>()
})
