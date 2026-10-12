import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { XiaohongshuSearchNotesResponse } from '../../../types/generated'
import { searchNotes as buildSearchNotes } from '../api'
import { getSearchId, getSearchRequestId, getSearchSessionId } from '../sign'
import { rap, xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 搜索笔记（POST）。
 *
 * `search_id` 是每次搜索的随机 id：在 `build` 里显式生成并传给
 * `api.searchNotes(data, searchId)`（api 保持纯函数，随机源归 `sign/`）。
 */
export const searchNotes = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.searchNotes',
  route: '/fetch_search_notes',
  doc: {
    summary: '笔记搜索结果列表',
    description: '按关键词搜笔记。翻页手动传 `page`，并复用相同的 `search_id` / `session_id`；可指定排序和笔记类型。'
  },
  params: zod.object({
    keyword: zod.string().min(1, { error: 'keyword 不能为空' }).describe('搜索关键词'),
    page: zod.coerce.number().int().min(1).optional().describe('页码，从 1 开始，默认 1'),
    page_size: zod.coerce.number().int().min(1).max(100).optional().describe('每页条数，默认 20'),
    sort: zod.enum(['general', 'popularity_descending', 'time_descending']).optional().describe('排序，默认综合'),
    note_type: zod.coerce
      .number()
      .pipe(zod.union([zod.literal(0), zod.literal(1), zod.literal(2)]))
      .optional()
      .describe('笔记类型：0 全部，1 视频，2 图文'),
    search_id: zod.string().min(1).optional().describe('搜索标识；翻页时复用'),
    session_id: zod.string().min(1).optional().describe('搜索会话标识；翻页时复用')
  }),
  build: (p): RequestSpec => {
    // search_id / session_id / search_request_id 三个随机源在 build 里生成后
    // 显式传给 api.searchNotes（api 保持纯函数，随机性归 sign/）。
    const { Url, Body, apiPath } = buildSearchNotes(
      p,
      p.search_id ?? getSearchId(),
      p.session_id ?? getSearchSessionId(),
      getSearchRequestId()
    )
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  // 搜索走 so.xiaohongshu.com/v2，签名仍是 XYS_（真机 CDP Fetch 层实测）。
  // 2026-03 之后搜索接口需额外的 x-rap-param 校验头。
  sign: [xs('post', 'xys'), rap()],
  response: type<XiaohongshuSearchNotesResponse>()
})
