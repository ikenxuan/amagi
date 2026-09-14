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
    description:
      '游标 `cursor` 由 `paginate` 管理（`has_more === 1` 继续翻页），调用方一般不传；传了就从这个游标起翻。' +
      '`number` 是**目标条数**，单页上限 50 条：一次调用会按需连打多页，把条目合并回最后一页的 `comments` 再返回。'
  },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数；由端点自动翻页后合并，默认 50（一页）'),
    cursor: zod.coerce.number().int().min(0).optional().describe('起始游标；翻页时由端点接续，一般不用传')
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
