import zod from 'zod'

import type { DouyinCommentRepliesResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { defineDouyinEndpoint, type } from './define'

/**
 * 二级评论（声明式翻页，maxPageSize 3，签名用 `x_bogus`）。
 *
 * 与旧版一致：`getCommentReplies` GET，签名器是 `x_bogus`，游标是 `cursor`
 * （`has_more === 1` 继续），最终形状 `{ ...最后一页, comments, cursor }`。
 */
export const commentReplies = defineDouyinEndpoint({
  name: 'douyin.commentReplies',
  route: '/fetch_video_comment_replies',
  doc: {
    summary: '指定评论的回复列表',
    description: '某条根评论下的回复列表，单页仅 3 条；整个评论区用 `comments`。'
  },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID'),
    comment_id: zod.string().min(1, { error: '评论ID不能为空' }).describe('要取回复的评论 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 3'),
    cursor: zod.coerce.number().int().min(0).optional().describe('翻页游标，一般不用传')
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getCommentReplies(p) }),
  sign: 'x-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  paginate: {
    maxPageSize: 3,
    items: (page) => page.comments ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: page.cursor }),
    // 跨页累积的条目回填到最后一页原位，使返回类型在多页调用下仍描述真实形状
    merge: ({ lastPage, items }) => ({ ...lastPage, comments: items, cursor: lastPage.cursor ?? items.length })
  },
  response: type<DouyinCommentRepliesResponse>()
})
