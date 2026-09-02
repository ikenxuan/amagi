import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { XiaohongshuReturnTypeMap } from '../../../types/ReturnDataType/Xiaohongshu'
import { searchNotes as buildSearchNotes } from '../api'
import { getSearchId } from '../sign'

/**
 * 搜索笔记（POST）。
 *
 * `search_id` 是每次搜索的随机 id：v7 在 `build` 里显式生成并传给
 * `api.searchNotes(data, searchId)`（api 保持纯函数，随机源归 sign/）。
 */
export const searchNotes = defineEndpoint({
  name: 'xiaohongshu.searchNotes',
  route: '/fetch_search_notes',
  doc: { summary: '笔记搜索结果列表' },
  params: zod.object({
    keyword: zod.string().min(1, { error: 'keyword 不能为空' }),
    page: zod.coerce.number().int().min(1).optional(),
    page_size: zod.coerce.number().int().min(1).max(100).optional()
  }),
  build: (p) => {
    const { Url, Body, apiPath } = buildSearchNotes(p, getSearchId())
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  sign: 'xhs-post',
  response: type<XiaohongshuReturnTypeMap['searchNotes']>()
})
