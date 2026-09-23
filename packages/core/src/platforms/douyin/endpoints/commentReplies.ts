import zod from 'zod'

import type { PaginatedValue } from '../../../runtime/paginate'
import type { DouyinCommentRepliesResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { defineDouyinEndpoint, type } from './define'

/**
 * 二级评论（声明式翻页，maxPageSize 3，签名用 `x_bogus`）。
 *
 * 与旧版一致：`getCommentReplies` GET，签名器是 `x_bogus`，游标是 `cursor`
 * （`has_more === 1` 继续），最终形状 `{ ...最后一页, comments, cursor }`。
 */
export const commentReplies = defineDouyinEndpoint({
  name: 'douyin.commentReplies',
  route: '/fetch_video_comment_replies',
  doc: {
    summary: '指定评论的回复列表',
    description: '某条根评论下的回复列表，单页仅 3 条；整个评论区用 `comments`。'
  },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID'),
    comment_id: zod.string().min(1, { error: '评论ID不能为空' }).describe('要取回复的评论 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 3'),
    cursor: zod.coerce.number().int().min(0).optional().describe('翻页游标，一般不用传')
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getCommentReplies(p) }),
  sign: 'x-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  paginate: {
    maxPageSize: 3,
    items: (page) => (page as CommentsPage).comments ?? [],
    hasMore: (page) => (page as CommentsPage).has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: (page as CommentsPage).cursor })
  },
  normalize: (decoded) => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as CommentsPage | undefined
    return { ...(page ?? {}), comments: items, cursor: page?.cursor ?? items.length } as DouyinCommentRepliesResponse
  },
  response: type<DouyinCommentRepliesResponse>()
})

/** 一页评论响应的形状（paginate 声明里用） */
interface CommentsPage {
  cursor?: number
  has_more?: number
  comments?: unknown[]
}
