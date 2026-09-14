import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliCommentRepliesResponse } from '../../../types/generated'
import { bilibiliApiUrls, type CommentType } from '../api'

/**
 * 指定评论的回复（单请求）。
 *
 * 与旧版一致：`getCommentReplies` GET，无签名。
 */
export const commentReplies = defineEndpoint({
  name: 'bilibili.commentReplies',
  route: '/fetch_comment_reply',
  doc: {
    summary: '指定评论的回复列表',
    description:
      '只取**一条根评论下**的楼中楼：单请求、不翻页，`number` 直接当 `ps` 发出去，条数由平台这一页给多少算多少。`oid` / `type` 的取值规则与 `comments` 完全一致；要整个评论区的列表用 `comments`。无签名，`-412` 时退避重试。'
  },
  params: zod.object({
    oid: zod.string().min(1, { error: 'OID不能为空' }).describe('目标对象 ID；视频稿件即 avid（去掉 `av` 前缀的数字）'),
    type: zod.coerce
      .number()
      .int()
      .min(1)
      .refine((val) => COMMENT_TYPES.includes(val), { error: '无效的评论区类型' })
      .describe('评论区类型 ID；视频稿件填 1'),
    root: zod.string().min(1, { error: '根评论ID不能为空' }).describe('根评论 ID（`rpid`），要展开的那条一级评论'),
    number: zod.coerce.number().int().positive().default(20).optional().describe('该根评论下的回复条数，单请求不翻页，默认 20')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getCommentReplies({ ...p, type: p.type as CommentType }) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliCommentRepliesResponse>()
})

/** 评论区类型枚举 */
const COMMENT_TYPES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33]
