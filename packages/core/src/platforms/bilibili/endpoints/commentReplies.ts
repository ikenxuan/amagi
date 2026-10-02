import zod from 'zod'

import type { BilibiliCommentRepliesResponse } from '../../../types/generated'
import { bilibiliApiUrls, commentTypeSchema } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 指定评论的回复（单请求）。
 *
 * 与旧版一致：`getCommentReplies` GET，无签名。
 */
export const commentReplies = defineBilibiliEndpoint({
  name: 'bilibili.commentReplies',
  route: '/fetch_comment_reply',
  doc: {
    summary: '指定评论的回复列表',
    description: '取单条根评论下的楼中楼回复；整个评论区的列表用 `comments`。'
  },
  params: zod.object({
    oid: zod.string().min(1, { error: 'OID不能为空' }).describe('目标对象 ID，视频稿件填 avid'),
    type: commentTypeSchema.describe(
      '评论区类型代码：1 视频稿件（oid=avid）、11 相簿/图片动态、12 专栏（cvid）、17 动态等；完整对照表见 bilibili-API-collect「评论区类型代码」'
    ),
    root: zod.string().min(1, { error: '根评论ID不能为空' }).describe('根评论 ID，即要展开的一级评论'),
    number: zod.coerce.number().int().positive().default(20).optional().describe('该根评论下的回复条数，不翻页，默认 20')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getCommentReplies(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliCommentRepliesResponse>()
})
