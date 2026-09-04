import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 作品评论（声明式翻页，maxPageSize 50）。
 *
 * 与 v6 的 `comments` 一致：`getComments` GET + a_bogus 签名，游标是
 * `cursor`（`has_more === 1` 继续），最终形状 `{ ...最后一页, comments, cursor }`
 * （v6 的 `formatFinalResponse`：`cursor: resp.cursor ?? list.length`）。
 */
export const comments = defineEndpoint({
  name: 'douyin.comments',
  route: '/fetch_work_comments',
  doc: { summary: '作品评论列表' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }),
    number: zod.coerce.number().int().min(1).optional(),
    cursor: zod.coerce.number().int().min(0).optional()
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getComments(p) }),
  sign: 'a-bogus',
  paginate: {
    maxPageSize: 50,
    items: (page) => (page as CommentsPage).comments ?? [],
    hasMore: (page) => (page as CommentsPage).has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: (page as CommentsPage).cursor })
  },
  normalize: (decoded) => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as CommentsPage | undefined
    return { ...(page ?? {}), comments: items, cursor: page?.cursor ?? items.length } as DouyinReturnTypeMap['comments']
  },
  response: type<DouyinReturnTypeMap['comments']>()
})

/** 一页评论响应的形状（paginate 声明里用） */
interface CommentsPage {
  cursor?: number
  has_more?: number
  comments?: unknown[]
}
