import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import { noteComments as buildNoteComments } from '../api'

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
export const noteComments = defineEndpoint({
  name: 'xiaohongshu.noteComments',
  route: '/fetch_note_comments',
  doc: { summary: '笔记评论列表' },
  params: zod.object({
    note_id: zod.string().min(1, { error: 'note_id 不能为空' }),
    xsec_token: zod.string().min(1, { error: 'xsec_token 不能为空' }),
    /** 目标条数；由 paginate 切成多次请求，平台不提供条数参数时默认一页 50 */
    number: zod.coerce.number().int().min(1).max(500).optional()
  }),
  build: (p) => {
    const { Url, apiPath } = buildNoteComments(p)
    return { method: 'GET', url: Url, signPath: apiPath }
  },
  sign: 'xhs-get',
  paginate: {
    maxPageSize: 50,
    items: (page) => ((page as NoteCommentsPage).data?.comments ?? []) as unknown[],
    hasMore: (page) => (page as NoteCommentsPage).data?.has_more === true,
    nextParams: (params, page) => ({
      ...params,
      cursor: (page as NoteCommentsPage).data?.cursor ?? ''
    })
  },
  // 跨页累积的条目回填到最后一页的原位，使
  // `XiaohongshuReturnTypeMap['noteComments']` 在多页调用下依然描述真实形状
  normalize: (decoded) => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as NoteCommentsPage | undefined
    return {
      ...(page ?? {}),
      data: {
        ...(page?.data ?? {}),
        comments: items
      }
    } as any
  },
  response: type<any>()
})

/** 一页评论响应的形状（paginate 声明里用） */
interface NoteCommentsPage {
  data?: {
    comments?: unknown[]
    cursor?: string
    has_more?: boolean
  }
}
