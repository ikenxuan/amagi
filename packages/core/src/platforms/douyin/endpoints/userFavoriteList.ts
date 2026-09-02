import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import type { PaginatedValue } from '../../../runtime/paginate'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 用户喜欢列表（声明式翻页，maxPageSize 18 + Referer 注入）。
 *
 * 与 v6 的 `userFavoriteList` 一致：`getUserFavoriteList` GET + a_bogus 签名，
 * 游标是 `max_cursor`（`has_more === 1` 继续），Referer 指向用户主页。
 */
export const userFavoriteList = defineEndpoint({
  name: 'douyin.userFavoriteList',
  route: '/fetch_user_favorite_list',
  doc: { summary: '用户主页点赞作品列表' },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }),
    number: zod.coerce.number().int().min(1).optional(),
    max_cursor: zod.string().optional()
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getUserFavoriteList(p),
    headers: withDouyinReferer(ctx, { kind: 'user', secUid: p.sec_uid })
  }),
  sign: 'a-bogus',
  paginate: {
    maxPageSize: 18,
    items: (page) => (page as UserListPage).aweme_list ?? [],
    hasMore: (page) => (page as UserListPage).has_more === 1,
    nextParams: (params, page) => ({ ...params, max_cursor: (page as UserListPage).max_cursor?.toString() ?? '0' })
  },
  normalize: (decoded): DouyinReturnTypeMap['userFavoriteList'] => {
    const { lastPage, items } = decoded as PaginatedValue
    return { ...((lastPage as object | undefined) ?? {}), aweme_list: items } as DouyinReturnTypeMap['userFavoriteList']
  },
  response: type<DouyinReturnTypeMap['userFavoriteList']>()
})

/** 一页用户列表响应的形状（paginate 声明里用） */
interface UserListPage {
  max_cursor?: number | string
  has_more?: number | boolean
  aweme_list?: unknown[]
}
