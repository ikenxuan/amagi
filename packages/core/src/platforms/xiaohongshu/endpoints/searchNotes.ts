import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { XiaohongshuSearchNotesResponse } from '../../../types/generated'
import { searchNotes as buildSearchNotes } from '../api'
import { getSearchId } from '../sign'

/**
 * 搜索笔记（POST）。
 *
 * `search_id` 是每次搜索的随机 id：在 `build` 里显式生成并传给
 * `api.searchNotes(data, searchId)`（api 保持纯函数，随机源归 `sign/`）。
 */
export const searchNotes = defineEndpoint({
  name: 'xiaohongshu.searchNotes',
  route: '/fetch_search_notes',
  doc: {
    summary: '笔记搜索结果列表',
    description:
      '`search_id` 是每次搜索现生成的随机 id，由 `build` 通过 `sign/` 的 `getSearchId()` 注入，调用方不用传。' +
      '排序与笔记类型在请求体里固定为综合排序（`general`）与全部类型（`0`），不暴露为参数。' +
      '翻页是手动的：`page` 从 1 开始、`page_size` 默认 20，下一页看响应里的 `data.has_more`。'
  },
  params: zod.object({
    keyword: zod.string().min(1, { error: 'keyword 不能为空' }).describe('搜索关键词'),
    page: zod.coerce.number().int().min(1).optional().describe('页码，从 1 开始，默认 1'),
    page_size: zod.coerce.number().int().min(1).max(100).optional().describe('每页条数，默认 20（上限 100）')
  }),
  build: (p) => {
    const { Url, Body, apiPath } = buildSearchNotes(p, getSearchId())
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  sign: 'xhs-post',
  response: type<XiaohongshuSearchNotesResponse>()
})
