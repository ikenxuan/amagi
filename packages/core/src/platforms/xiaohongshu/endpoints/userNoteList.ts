import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { XiaohongshuUserNoteListResponse } from '../../../types/generated'
import { userNoteList as buildUserNoteList } from '../api'
import { guestFallbackPrepare } from '../guestPrepare'
import { rap, traceId, xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, type } from './define'

/** 用户笔记列表：GET，XYS_ 与 x-rap-param，携带反爬 token。 */
export const userNoteList = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.userNoteList',
  route: '/fetch_user_notes',
  doc: {
    summary: '用户笔记列表',
    description: '取用户的笔记列表。翻页要手动：`cursor` 传上一页最后一条的 ID。'
  },
  params: zod.object({
    user_id: zod.string().min(1, { error: 'user_id 不能为空' }).describe('用户 ID'),
    xsec_token: zod.string().min(1, { error: 'xsec_token 不能为空' }).describe('反爬令牌，随笔记分享链接下发'),
    xsec_source: zod.string().optional().describe('反爬来源，默认 pc_feed'),
    cursor: zod.string().optional().describe('翻页游标；传上一页最后一条的 ID，首页不传'),
    num: zod.coerce.number().int().min(1).max(100).optional().describe('单次请求的笔记条数，默认 30')
  }),
  prepare: guestFallbackPrepare,
  build: (p): RequestSpec => {
    const { Url, apiPath, signParams } = buildUserNoteList(p)
    // signParams 透传给签名器：GET 的 x-s 必须覆盖 query，否则平台返回 406
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  sign: [xs('get', 'xys'), rap('query'), traceId()],
  response: type<XiaohongshuUserNoteListResponse>()
})
