import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import type { DouyinUserFavoriteListResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 用户喜欢列表（声明式翻页，maxPageSize 18 + Referer 注入）。
 *
 * 与旧版一致：`getUserFavoriteList` GET + a_bogus 签名，
 * 游标是 `max_cursor`（`has_more === 1` 继续），Referer 指向用户主页。
 */
export const userFavoriteList = defineEndpoint({
  name: 'douyin.userFavoriteList',
  route: '/fetch_user_favorite_list',
  doc: {
    summary: '用户主页点赞作品列表',
    description:
      '与 `userVideoList` 同一套翻页（`max_cursor` + `has_more === 1`）与 Referer 注入，区别是取该用户的**喜欢**列表而不是其发布的作品。' +
      '`number` 是目标条数、单页上限 18，跨页条目合并回最后一页的 `aweme_list`。'
  },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }).describe('用户 sec_uid（主页 URL `douyin.com/user/<sec_uid>` 里那段）'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数；由端点自动翻页后合并，默认 18（一页）'),
    max_cursor: zod.string().optional().describe('起始游标；翻页时由端点接续，一般不用传')
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getUserFavoriteList(p),
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
    hasMore: (page) => (page as UserListPage).has_more === 1,
    nextParams: (params, page) => ({ ...params, max_cursor: (page as UserListPage).max_cursor?.toString() ?? '0' })
  },
  normalize: (decoded) => {
    const { lastPage, items } = decoded as PaginatedValue
    return { ...((lastPage as object | undefined) ?? {}), aweme_list: items } as DouyinUserFavoriteListResponse
  },
  response: type<DouyinUserFavoriteListResponse>()
})

/** 一页用户列表响应的形状（paginate 声明里用） */
interface UserListPage {
  max_cursor?: number | string
  has_more?: number | boolean
  aweme_list?: unknown[]
}
