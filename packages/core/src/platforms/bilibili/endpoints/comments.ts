//#region docs-import-order
import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import type { BilibiliCommentsResponse } from '../../../types/generated'
import { bilibiliApiUrls, type CommentType } from '../api'
//#endregion
// 上面那对标记被文档站的 `<include …#docs-import-order>` 引作「导入顺序」的活例子：
// 改名或删掉会让文档站构建失败。

/**
 * 评论区（wbi 签名 + 声明式翻页）。
 *
 * `mode` / `pagination_str` / `plat` / `seek_rpid` / `web_location` 都是
 * params 上的显式字段，`getComments` 读的就是它们。
 *
 * 翻页与最终形状：
 * - 翻页游标走 `pagination_str`（`cursor.pagination_reply.next_offset`），
 *   `is_end` 为真或本页为空时停止。
 * - 最终形状 `{ ...最后一页, data: { ...lastPage.data, replies } }`，
 *   按 `rpid` 去重 + 截断到 `number`。
 * - 未开放评论区由主接口返回非 0 的 `code`，由 judge 判失败。
 */
export const comments = defineEndpoint({
  name: 'bilibili.comments',
  route: '/fetch_work_comments',
  doc: { summary: '作品评论列表' },
  params: zod.object({
    oid: zod.string().min(1, { error: 'OID不能为空' }),
    type: zod.coerce
      .number()
      .int()
      .min(1)
      .refine((val) => COMMENT_TYPES.includes(val), { error: '无效的评论区类型' }),
    number: zod.coerce.number().int().positive().default(20).optional(),
    mode: zod.coerce.number().int().min(0).max(3).optional(),
    pagination_str: zod.string().optional(), // 翻页游标
    plat: zod.coerce.number().int().optional(),
    seek_rpid: zod.string().optional(),
    web_location: zod.string().optional()
  }),
  build: (p) => ({
    method: 'GET',
    url: bilibiliApiUrls.getComments({ ...p, type: p.type as CommentType, mode: p.mode as 0 | 1 | 2 | 3 | undefined })
  }),
  sign: 'wbi',
  paginate: {
    maxPageSize: 100,
    items: (page) => (page as CommentsPage).data?.replies ?? [],
    hasMore: (page) => {
      const cursor = (page as CommentsPage).data?.cursor
      return cursor ? cursor.is_end !== true : false
    },
    nextParams: (params, page) => {
      const next = (page as CommentsPage).data?.cursor?.pagination_reply?.next_offset
      return { ...params, pagination_str: next ?? params.pagination_str }
    }
  },
  normalize: (decoded, params) => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as CommentsPage | undefined
    const deduped = Array.from(new Map((items as Array<{ rpid?: unknown }>).map((item) => [item.rpid, item])).values())
    const sliced = deduped.slice(0, params.number ?? 20)
    return {
      ...(page ?? {}),
      data: {
        ...(page?.data ?? {}),
        replies: sliced
      }
    } as BilibiliCommentsResponse
  },
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliCommentsResponse>()
})

/** 评论区类型枚举 */
const COMMENT_TYPES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33]

/** 一页评论响应的形状（paginate 声明里用） */
interface CommentsPage {
  data?: {
    replies?: unknown[]
    cursor?: {
      is_end?: boolean
      pagination_reply?: { next_offset?: string }
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}
