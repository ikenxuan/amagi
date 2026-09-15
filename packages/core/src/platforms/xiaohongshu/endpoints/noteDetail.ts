import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { XiaohongshuNoteDetailResponse } from '../../../types/generated'
import { noteDetail as buildNoteDetail } from '../api'

/**
 * 笔记详情（POST）。
 *
 * `note_id` 与 `xsec_token` 都要求 `min(1)`：空字符串会发出一个必败的请求。
 */
export const noteDetail = defineEndpoint({
  name: 'xiaohongshu.noteDetail',
  route: '/fetch_one_note',
  doc: {
    summary: '笔记详细信息',
    description: '取笔记正文与互动数据。要评论区用 `noteComments`。'
  },
  params: zod.object({
    note_id: zod.string().min(1, { error: 'note_id 不能为空' }).describe('笔记 ID；从笔记分享链接里取'),
    xsec_token: zod.string().min(1, { error: 'xsec_token 不能为空' }).describe('反爬令牌，随笔记分享链接下发，不能自己拼')
  }),
  build: (p) => {
    const { Url, Body, apiPath } = buildNoteDetail(p)
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  sign: 'xhs-post',
  response: type<XiaohongshuNoteDetailResponse>()
})
