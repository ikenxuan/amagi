import zod from 'zod'

import type { XiaohongshuNoteCommentsResponse } from '../../../types/generated'
import { noteComments as buildNoteComments } from '../api'
import { traceId, xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 笔记评论（GET + 声明式翻页）。
 *
 * `cursor` 由 `paginate` 声明管理，不暴露为自由参数：调用方只关心要多少条，
 * 游标由管线自动携带。
 *
 * xhs 响应里的 `data.cursor` 是 string（平台协议如此），
 * `data.has_more` 是 boolean，与抖音的 `has_more === 1` 不同 ——
 * 差异收敛在 `paginate` 声明里，管线不感知。
 */
export const noteComments = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.noteComments',
  route: '/fetch_note_comments',
  doc: {
    summary: '笔记评论列表',
    description: '取笔记评论列表。`number` 指定目标条数，翻页由端点自动完成。'
  },
  params: zod.object({
    note_id: zod.string().min(1, { error: 'note_id 不能为空' }).describe('笔记 ID；从笔记分享链接里取'),
    xsec_token: zod.string().min(1, { error: 'xsec_token 不能为空' }).describe('反爬令牌，随笔记分享链接下发'),
    number: zod.coerce.number().int().min(1).max(500).optional().describe('目标条数，默认一页')
  }),
  build: (p) => {
    const { Url, apiPath, signParams } = buildNoteComments(p)
    // signParams 透传给签名器：GET 的 x-s 必须覆盖 query，否则平台返回 406
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  // 抓包实证：comment/page 用 XYS_ 签名（非 XYW_），且带 x-b3-traceid
  sign: [xs('get', 'xys'), traceId()],
  paginate: {
    maxPageSize: 50,
    items: (page) => page.data?.comments ?? [],
    hasMore: (page) => page.data?.has_more === true,
    nextParams: (params, page) => ({ ...params, cursor: page.data?.cursor ?? '' }),
    // 跨页累积的条目回填到最后一页 data.comments 的原位，使返回类型在多页调用下仍描述真实形状
    merge: ({ lastPage, items }) => ({ ...lastPage, data: { ...lastPage.data, comments: items } })
  },
  response: type<XiaohongshuNoteCommentsResponse>()
})
