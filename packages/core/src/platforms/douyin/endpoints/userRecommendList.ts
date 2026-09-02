import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import type { PaginatedValue } from '../../../runtime/paginate'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 用户推荐列表（声明式翻页，maxPageSize 18 + Referer 注入）。
 *
 * 与 v6 的 `userRecommendList` 一致：`getUserRecommendList` GET + a_bogus
 * 签名，游标是 `max_cursor`。**注意 v6 的 `hasMore` 是 `has_more === true`
 * （布尔），与 userVideoList / userFavoriteList 的 `=== 1` 不同** —— 这里
 * 逐字保留。
 */
export const userRecommendList = defineEndpoint({
  name: 'douyin.userRecommendList',
  route: '/fetch_user_recommend_list',
  doc: { summary: '用户主页推荐作品列表' },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }),
    number: zod.coerce.number().int().min(1).optional(),
    max_cursor: zod.string().optional()
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getUserRecommendList(p),
    headers: withDouyinReferer(ctx, { kind: 'user', secUid: p.sec_uid })
  }),
  sign: 'a-bogus',
  paginate: {
    maxPageSize: 18,
    items: (page) => (page as UserListPage).aweme_list ?? [],
    hasMore: (page) => (page as UserListPage).has_more === true, // v6 逐字保留
    nextParams: (params, page) => ({ ...params, max_cursor: (page as UserListPage).max_cursor?.toString() ?? '0' })
  },
  normalize: (decoded): DouyinReturnTypeMap['userRecommendList'] => {
    const { lastPage, items } = decoded as PaginatedValue
    return { ...((lastPage as object | undefined) ?? {}), aweme_list: items } as DouyinReturnTypeMap['userRecommendList']
  },
  response: type<DouyinReturnTypeMap['userRecommendList']>()
})

/** 一页用户列表响应的形状（paginate 声明里用） */
interface UserListPage {
  max_cursor?: number | string
  has_more?: number | boolean
  aweme_list?: unknown[]
}
