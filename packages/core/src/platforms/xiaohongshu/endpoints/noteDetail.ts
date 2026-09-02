import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { XiaohongshuReturnTypeMap } from '../../../types/ReturnDataType/Xiaohongshu'
import { noteDetail as buildNoteDetail } from '../api'

/**
 * 笔记详情（POST）。
 *
 * 修 #60：`note_id` 补 `min(1)` —— v6 允许空字符串，会发出一个必败的请求。
 */
export const noteDetail = defineEndpoint({
  name: 'xiaohongshu.noteDetail',
  route: '/fetch_one_note',
  doc: { summary: '笔记详细信息' },
  params: zod.object({
    note_id: zod.string().min(1, { error: 'note_id 不能为空' }),
    xsec_token: zod.string().min(1, { error: 'xsec_token 不能为空' })
  }),
  build: (p) => {
    const { Url, Body, apiPath } = buildNoteDetail(p)
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  sign: 'xhs-post',
  response: type<XiaohongshuReturnTypeMap['noteDetail']>()
})
