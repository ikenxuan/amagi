import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import type { DouyinCommentsResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'

/**
 * 作品评论（声明式翻页，maxPageSize 50）。
 *
 * 与旧版一致：`getComments` GET + a_bogus 签名，游标是
 * `cursor`（`has_more === 1` 继续），最终形状 `{ ...最后一页, comments, cursor }`
 * （`cursor: resp.cursor ?? list.length`）。
 */
export const comments = defineEndpoint({
  name: 'douyin.comments',
  route: '/fetch_work_comments',
  doc: {
    summary: '作品评论列表',
    description: '作品的一级评论列表；某条评论下的回复用 `commentReplies`。'
  },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 50'),
    cursor: zod.coerce.number().int().min(0).optional().describe('翻页游标，一般不用传')
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getComments(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  paginate: {
    maxPageSize: 50,
    items: (page) => (page as CommentsPage).comments ?? [],
    hasMore: (page) => (page as CommentsPage).has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: (page as CommentsPage).cursor })
  },
  normalize: (decoded) => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as CommentsPage | undefined
    return { ...(page ?? {}), comments: items, cursor: page?.cursor ?? items.length } as DouyinCommentsResponse
  },
  response: type<DouyinCommentsResponse>()
})

/** 一页评论响应的形状（paginate 声明里用） */
interface CommentsPage {
  cursor?: number
  has_more?: number
  comments?: unknown[]
}
