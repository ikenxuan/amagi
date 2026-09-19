import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { userNoteList as buildUserNoteList } from '../api'

/**
 * 用户笔记列表（GET + x-b3-traceid，XYW_ 签名）。
 *
 * 这个端点额外带 `x-b3-traceid` 头，且属于数据获取类接口 —— 自 2026-03 起传统
 * XYS_ 签名会被平台以 HTTP 406 拒绝，因此用 `'xhs-get-xyw-trace'`
 * （XYW_ GET 签名 + traceid），而不是给所有 GET 都换。
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
    xsec_token: zod.string().min(1, { error: 'xsec_token 不能为空' }).describe('反爬令牌，随笔记分享链接下发'),
    cursor: zod.string().optional().describe('翻页游标；传上一页最后一条的 ID，首页不传'),
    num: zod.coerce.number().int().min(1).max(100).optional().describe('单次请求的笔记条数，默认 30')
  }),
  build: (p) => {
    const { Url, apiPath, signParams } = buildUserNoteList(p)
    // signParams 透传给签名器：GET 的 x-s（含 XYW_）必须覆盖 query，否则平台返回 406
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  sign: 'xhs-get-xyw-trace',
  response: type<any>()
})
