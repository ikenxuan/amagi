import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls, type CommentType } from '../api'

/**
 * 指定评论的回复（单请求）。
 *
 * 与 v6 的 `commentReplies` 一致：`getCommentReplies` GET，无签名。
 */
export const commentReplies = defineEndpoint({
  name: 'bilibili.commentReplies',
  route: '/fetch_comment_reply',
  params: zod.object({
    oid: zod.string().min(1, { error: 'OID不能为空' }),
    type: zod.coerce.number().int().min(1).refine((val) => COMMENT_TYPES.includes(val), { error: '无效的评论区类型' }),
    root: zod.string().min(1, { error: '根评论ID不能为空' }),
    number: zod.coerce.number().int().positive().default(20).optional()
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getCommentReplies({ ...p, type: p.type as CommentType }) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<CommentRepliesData>()
})

/** v6 评论区类型枚举（validation/bilibili.ts 逐字保留） */
const COMMENT_TYPES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33]

/** 评论回复响应（与 v6 形状一致的最小声明） */
export interface CommentRepliesData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
