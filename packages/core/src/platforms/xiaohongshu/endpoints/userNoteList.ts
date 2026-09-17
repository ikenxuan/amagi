import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { userNoteList as buildUserNoteList } from '../api'

/**
 * 用户笔记列表（GET + x-b3-traceid）。
 *
 * 这个端点额外带 `x-b3-traceid` 头，因此单独用一个签名器
 * `'xhs-get-trace'`（GET 签名 + traceid），而不是给所有 GET 都加。
 */
export const userNoteList = defineEndpoint({
  name: 'xiaohongshu.userNoteList',
  route: '/fetch_user_notes',
  doc: {
    summary: '用户笔记列表',
    description: '取用户的笔记列表。翻页要手动：`cursor` 传上一页最后一条的 ID。'
  },
  params: zod.object({
    user_id: zod.string().min(1, { error: 'user_id 不能为空' }).describe('用户 ID'),
    cursor: zod.string().optional().describe('翻页游标；传上一页最后一条的 ID，首页不传'),
    num: zod.coerce.number().int().min(1).max(100).optional().describe('单次请求的笔记条数，默认 30')
  }),
  build: (p) => {
    const { Url, apiPath } = buildUserNoteList(p)
    return { method: 'GET', url: Url, signPath: apiPath }
  },
  sign: 'xhs-get-trace',
  response: type<any>()
})
