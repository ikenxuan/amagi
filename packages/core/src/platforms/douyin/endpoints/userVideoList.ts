import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 用户作品列表（声明式翻页，maxPageSize 18 + Referer 注入）。
 *
 * 与 v6 的 `userVideoList` 一致：`getUserVideoList` GET + a_bogus 签名，
 * 游标是 `max_cursor`（字符串，`has_more === 1` 继续），Referer 指向用户主页。
 * 最终形状 `{ ...最后一页, aweme_list }`（v6 的 `formatFinalResponse`）。
 */
export const userVideoList = defineEndpoint({
  name: 'douyin.userVideoList',
  route: '/fetch_user_post_videos',
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }),
    number: zod.coerce.number().int().min(1).optional(),
    max_cursor: zod.string().optional()
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getUserVideoList(p),
    headers: withDouyinReferer(ctx, { kind: 'user', secUid: p.sec_uid })
  }),
  sign: 'a-bogus',
  paginate: {
    maxPageSize: 18,
    items: (page) => (page as UserListPage).aweme_list ?? [],
    hasMore: (page) => (page as UserListPage).has_more === 1,
    nextParams: (params, page) => ({ ...params, max_cursor: (page as UserListPage).max_cursor?.toString() ?? '0' })
  },
  normalize: (decoded) => {
    const { lastPage, items } = decoded as PaginatedValue
    return { ...((lastPage as object | undefined) ?? {}), aweme_list: items }
  },
  response: type<UserListData>()
})

/** 一页用户列表响应的形状（paginate 声明里用） */
interface UserListPage {
  max_cursor?: number | string
  has_more?: number | boolean
  aweme_list?: unknown[]
}

/** 用户列表响应（与 v6 形状一致的最小声明） */
export interface UserListData {
  aweme_list: unknown[]
  [key: string]: unknown
}
