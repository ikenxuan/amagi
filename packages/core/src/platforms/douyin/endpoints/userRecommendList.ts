import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import type { DouyinUserRecommendListResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 用户推荐列表（声明式翻页，maxPageSize 18 + Referer 注入）。
 *
 * 与旧版一致：`getUserRecommendList` GET + a_bogus
 * 签名，游标是 `max_cursor`。**`hasMore` 判的是 `has_more === true`（布尔）**，
 * 与 userVideoList / userFavoriteList 的 `=== 1` 不同。
 */
export const userRecommendList = defineEndpoint({
  name: 'douyin.userRecommendList',
  route: '/fetch_user_recommend_list',
  doc: {
    summary: '用户主页推荐作品列表',
    description: '主页的推荐流作品，不保证是该用户发布的；自己的作品用 `userVideoList`。'
  },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }).describe('用户 sec_uid，主页链接里那段'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 18'),
    max_cursor: zod.string().optional().describe('翻页游标，一般不用传')
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getUserRecommendList(p),
    headers: withDouyinReferer(ctx, { kind: 'user', secUid: p.sec_uid })
  }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  paginate: {
    maxPageSize: 18,
    items: (page) => (page as UserListPage).aweme_list ?? [],
    hasMore: (page) => (page as UserListPage).has_more === true,
    nextParams: (params, page) => ({ ...params, max_cursor: (page as UserListPage).max_cursor?.toString() ?? '0' })
  },
  normalize: (decoded) => {
    const { lastPage, items } = decoded as PaginatedValue
    return { ...((lastPage as object | undefined) ?? {}), aweme_list: items } as DouyinUserRecommendListResponse
  },
  response: type<DouyinUserRecommendListResponse>()
})

/** 一页用户列表响应的形状（paginate 声明里用） */
interface UserListPage {
  max_cursor?: number | string
  has_more?: number | boolean
  aweme_list?: unknown[]
}
