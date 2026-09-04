import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 二级评论（声明式翻页，maxPageSize 3，签名用 `x_bogus`）。
 *
 * 与 v6 的 `commentReplies` 一致：`getCommentReplies` GET，签名器是
 * `x_bogus`（v6 的 `signType: 'x_bogus'`），游标是 `cursor`
 * （`has_more === 1` 继续），最终形状 `{ ...最后一页, comments, cursor }`。
 */
export const commentReplies = defineEndpoint({
  name: 'douyin.commentReplies',
  route: '/fetch_video_comment_replies',
  doc: { summary: '指定评论的回复列表' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }),
    comment_id: zod.string().min(1, { error: '评论ID不能为空' }),
    number: zod.coerce.number().int().min(1).optional(),
    cursor: zod.coerce.number().int().min(0).optional()
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getCommentReplies(p) }),
  sign: 'x-bogus',
  paginate: {
    maxPageSize: 3,
    items: (page) => (page as CommentsPage).comments ?? [],
    hasMore: (page) => (page as CommentsPage).has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: (page as CommentsPage).cursor })
  },
  normalize: (decoded) => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as CommentsPage | undefined
    return { ...(page ?? {}), comments: items, cursor: page?.cursor ?? items.length } as DouyinReturnTypeMap['commentReplies']
  },
  response: type<DouyinReturnTypeMap['commentReplies']>()
})

/** 一页评论响应的形状（paginate 声明里用） */
interface CommentsPage {
  cursor?: number
  has_more?: number
  comments?: unknown[]
}
