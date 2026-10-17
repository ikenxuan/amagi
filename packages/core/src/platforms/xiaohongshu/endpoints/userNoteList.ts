import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { XiaohongshuUserNoteListResponse } from '../../../types/generated'
import { userNoteList as buildUserNoteList } from '../api'
import { rap, traceId, xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 用户笔记列表（GET + XYS_ 签名 + x-rap-param + x-b3-traceid）。
 *
 * 签名用 XYS_（与 v6 一致）—— 真机实证（2026-10-11）：同一游客 cookie 下 `user_posted`
 * 用 **XYS_ 回 200 + 真数据**、用 XYW_ 回 **HTTP 461 空 data**；且 v6/legacy 本就只有 XYS
 * （无 XYW）。早先「数据接口 XYS 会 406 必须换 XYW」是未经线上验证的文档默认值，已被平台
 * 改回、不再成立。`x-rap-param` 按 query 计算（真机 `user_posted` 带这个头，`otherinfo` 不带）。
 *
 * `xsec_token`：游客必传（user 级令牌，缺它平台回 461），有效登录 CK 可省（省略时 query
 * 不带这个键）。`xsec_source` 缺省 `pc_feed`。
 */
export const userNoteList = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.userNoteList',
  route: '/fetch_user_notes',
  doc: {
    summary: '用户笔记列表',
    description: '取用户的笔记列表。翻页要手动：`cursor` 传上一页最后一条的 ID。'
  },
  params: zod.object({
    user_id: zod.string().min(1, { error: 'user_id 不能为空' }).describe('用户 ID'),
    xsec_token: zod
      .string()
      .optional()
      .describe('反爬令牌，随用户主页分享链接下发；游客必传、有效登录 CK 可省；**与发放它的会话绑定**（游客下换会话即 461）'),
    xsec_source: zod.string().optional().describe('反爬来源，默认 pc_feed'),
    cursor: zod.string().optional().describe('翻页游标；传上一页最后一条的 ID，首页不传'),
    num: zod.coerce.number().int().min(1).max(100).optional().describe('单次请求的笔记条数，默认 30')
  }),
  build: (p): RequestSpec => {
    const { Url, apiPath, signParams } = buildUserNoteList(p)
    // signParams 透传给签名器：GET 的 x-s 必须覆盖 query（含 xsec_token），否则平台返回 406 / 461
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  sign: [xs('get', 'xys'), rap('query'), traceId()],
  response: type<XiaohongshuUserNoteListResponse>()
})
