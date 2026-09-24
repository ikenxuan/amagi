//#region docs-import-order
import zod from 'zod'

import type { BilibiliCommentsResponse } from '../../../types/generated'
import { bilibiliApiUrls, type CommentType } from '../api'
import { defineBilibiliEndpoint, type } from './define'
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
export const comments = defineBilibiliEndpoint({
  name: 'bilibili.comments',
  route: '/fetch_work_comments',
  doc: {
    summary: '作品评论列表',
    description: '取作品评论列表，按 `number` 自动翻页并去重；楼中楼用 `commentReplies`。'
  },
  params: zod.object({
    oid: zod.string().min(1, { error: 'OID不能为空' }).describe('目标对象 ID，视频稿件填 avid'),
    type: zod.coerce
      .number()
      .int()
      .min(1)
      .refine((val) => COMMENT_TYPES.includes(val), { error: '无效的评论区类型' })
      .describe('评论区类型，视频稿件填 1'),
    number: zod.coerce.number().int().positive().default(20).optional().describe('目标条数，自动翻页合并后去重，默认 20'),
    mode: zod.coerce.number().int().min(0).max(3).optional().describe('排序方式，默认 3'),
    pagination_str: zod.string().optional().describe('翻页游标，由端点接管，不用传'),
    plat: zod.coerce.number().int().optional().describe('平台类型，默认 1'),
    seek_rpid: zod.string().optional().describe('定位到某条评论，默认空'),
    web_location: zod.string().optional().describe('web 位置参数，默认 1315875')
  }),
  build: (p) => ({
    method: 'GET',
    url: bilibiliApiUrls.getComments({ ...p, type: p.type as CommentType, mode: p.mode as 0 | 1 | 2 | 3 | undefined })
  }),
  sign: 'wbi',
  paginate: {
    maxPageSize: 100,
    items: (page) => page.data?.replies ?? [],
    hasMore: (page) => {
      const cursor = page.data?.cursor
      return cursor ? cursor.is_end !== true : false
    },
    nextParams: (params, page) => {
      const next = page.data?.cursor?.pagination_reply?.next_offset
      return { ...params, pagination_str: next ?? params.pagination_str }
    },
    // 跨页累积按 rpid 去重、截断到 number，回填到最后一页 data.replies 的原位，
    // 使返回类型在多页调用下仍描述真实形状
    merge: ({ lastPage, items }, params) => {
      const deduped = Array.from(new Map(items.map((item) => [item.rpid, item])).values())
      const sliced = deduped.slice(0, params.number ?? 20)
      return { ...lastPage, data: { ...lastPage.data, replies: sliced } }
    }
  },
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliCommentsResponse>()
})

/** 评论区类型枚举 */
const COMMENT_TYPES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33]
