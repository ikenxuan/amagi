import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinUserVideoListResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, internalParam, type } from './define'

/**
 * 用户作品列表（声明式翻页，maxPageSize 18 + Referer 注入）。
 *
 * 与旧版一致：`getUserVideoList` GET + a_bogus 签名，
 * 游标是 `max_cursor`（字符串，`has_more === 1` 继续），Referer 指向用户主页。
 * 最终形状 `{ ...最后一页, aweme_list }`。
 */
export const userVideoList = defineDouyinEndpoint({
  name: 'douyin.userVideoList',
  route: '/fetch_user_post_videos',
  doc: {
    summary: '用户主页作品列表',
    description: '该用户发布的作品列表；喜欢列表用 `userFavoriteList`。'
  },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }).describe('用户 sec_uid，主页链接里那段'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 18'),
    max_cursor: internalParam(zod.string().optional().describe('翻页游标，一般不用传'))
  }),
  build: (p, ctx): RequestSpec => ({
    method: 'GET',
    url: createDouyinApiUrls(ctx.userAgent).getUserVideoList(p),
    headers: withDouyinReferer(ctx, { kind: 'user', secUid: p.sec_uid })
  }),
  sign: douyinBogus(184),
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  // 中途某页失败时保留已取数据，截断经 meta.incomplete 显式告知
  partial: 'tolerate',
  paginate: {
    maxPageSize: 18,
    items: (page) => page.aweme_list ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, max_cursor: page.max_cursor?.toString() ?? '0' }),
    // 跨页累积的条目回填到最后一页原位，使返回类型在多页调用下仍描述真实形状
    merge: ({ lastPage, items }) => ({ ...lastPage, aweme_list: items })
  },
  response: type<DouyinUserVideoListResponse>()
})
