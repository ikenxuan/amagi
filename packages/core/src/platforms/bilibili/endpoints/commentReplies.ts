import zod from 'zod'

import type { BilibiliCommentRepliesResponse } from '../../../types/generated'
import { bilibiliApiUrls, type CommentType } from '../api'
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
    type: zod.coerce
      .number()
      .int()
      .min(1)
      .refine((val) => COMMENT_TYPES.includes(val), { error: '无效的评论区类型' })
      .describe('评论区类型，视频稿件填 1'),
    root: zod.string().min(1, { error: '根评论ID不能为空' }).describe('根评论 ID，即要展开的一级评论'),
    number: zod.coerce.number().int().positive().default(20).optional().describe('该根评论下的回复条数，不翻页，默认 20')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getCommentReplies({ ...p, type: p.type as CommentType }) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliCommentRepliesResponse>()
})

/** 评论区类型枚举 */
const COMMENT_TYPES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33]
