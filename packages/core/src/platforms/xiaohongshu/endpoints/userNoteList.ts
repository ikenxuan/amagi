import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { userNoteList as buildUserNoteList } from '../api'

/**
 * 用户笔记列表（GET + x-b3-traceid）。
 *
 * v6 里只有这个端点额外带 `x-b3-traceid` 头，因此单独用一个签名器
 * `'xhs-get-trace'`（GET 签名 + traceid），而不是给所有 GET 都加。
 */
export const userNoteList = defineEndpoint({
  name: 'xiaohongshu.userNoteList',
  route: '/fetch_user_notes',
  doc: { summary: '用户笔记列表' },
  params: zod.object({
    user_id: zod.string().min(1, { error: 'user_id 不能为空' }),
    cursor: zod.string().optional(),
    num: zod.coerce.number().int().min(1).max(100).optional()
  }),
  build: (p) => {
    const { Url, apiPath } = buildUserNoteList(p)
    return { method: 'GET', url: Url, signPath: apiPath }
  },
  sign: 'xhs-get-trace',
  response: type<UserNoteListData>()
})

/** 用户笔记列表响应。不复用 `XiaohongshuReturnTypeMap['userNoteList']`：v6 映射表此键为 `any`。 */
export interface UserNoteListData {
  code: number
  msg: string
  success: boolean
  data: {
    cursor: string
    has_more: boolean
    notes: Array<{ id: string; type: string; xsec_token: string }>
  }

  /** 平台加字段不算 breaking（06-migration：类型是实测快照） */
  [key: string]: unknown
}
