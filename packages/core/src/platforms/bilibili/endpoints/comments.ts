import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import type { PaginatedValue } from '../../../runtime/paginate'
import { bilibiliApiUrls, type CommentType } from '../api'

/**
 * 评论区（wbi 签名 + 声明式翻页 + 5 个被 strip 的参数补齐）。
 *
 * 修 #52 与 A6：v6 的 comments schema 只声明 methodType / oid / type /
 * number / pn，`mode` / `pagination_str` / `plat` / `seek_rpid` /
 * `web_location` 五个字段被 zod strip 静默丢弃 —— 翻页游标恒为 undefined
 * （永远从第一页开始），排序模式恒回落到 3（KNOWN-DEFECT 有测试锁死）。
 * v7 的 params schema 补全这 5 个字段，`getComments` 也改为读 params。
 *
 * 与 v6 的行为差异：
 * - 翻页游标走 `pagination_str`（`cursor.pagination_reply.next_offset`），
 *   `is_end` 为真或本页为空时停止。
 * - 最终形状 `{ ...最后一页, data: { ...lastPage.data, replies } }`，
 *   与 v6 的 `formatFinalResponse` 一致（按 `rpid` 去重 + 截断到 number）。
 * - v6 的「评论区未开放」前置检查（`getCommentStatus`）不搬：它只是一个
 *   提前失败的优化，主接口对未开放评论区会返回非 0 的 `code`，由 judge
 *   判失败，语义等价。
 */
export const comments = defineEndpoint({
  name: 'bilibili.comments',
  route: '/fetch_work_comments',
  doc: { summary: '作品评论列表' },
  params: zod.object({
    oid: zod.string().min(1, { error: 'OID不能为空' }),
    type: zod.coerce.number().int().min(1).refine((val) => COMMENT_TYPES.includes(val), { error: '无效的评论区类型' }),
    number: zod.coerce.number().int().positive().default(20).optional(),
    mode: zod.coerce.number().int().min(0).max(3).optional(), // #52：不再被 strip
    pagination_str: zod.string().optional(), // #52：翻页游标
    plat: zod.coerce.number().int().optional(), // #52
    seek_rpid: zod.string().optional(), // #52
    web_location: zod.string().optional() // #52
  }),
  build: (p) => ({
    method: 'GET',
    url: bilibiliApiUrls.getComments({ ...p, type: p.type as CommentType, mode: p.mode as 0 | 1 | 2 | 3 | undefined })
  }),
  sign: 'wbi',
  paginate: {
    maxPageSize: 100, // v6 的 maxRequestCount
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
  normalize: (decoded, params): BilibiliReturnTypeMap['comments'] => {
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
    } as BilibiliReturnTypeMap['comments']
  },
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['comments']>()
})

/** v6 评论区类型枚举（validation/bilibili.ts 逐字保留） */
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
