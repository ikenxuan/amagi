import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { XiaohongshuUserProfileResponse } from '../../../types/generated'
import { userProfile as buildUserProfile } from '../api'
import { traceId, xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 用户信息（GET，走 API）。
 *
 * 请求 `edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id={id}`，
 * 返回稳定 JSON（参照 cvcat/Spider_XHS 实抓）。早前抓 HTML `__INITIAL_STATE__`
 * 的方式因前端改用 Vue 3 ref 包装、结构随版本漂移而易碎，故改走 API。
 *
 * 2026-10-04 真机对照：线上还带 `xsec_token` 与 `xsec_source=pc_feed`（随用户主页
 * 链接下发）。传了就与线上逐字一致；不传只发 `target_user_id`。**游客应传 `xsec_token`**
 * （上游 2026-10-12 实测：HTML 主页不带它只回未水合空壳；且令牌与发放它的会话绑定，
 * 游客下换会话即 461）；有效登录 CK 可省。
 */
export const userProfile = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.userProfile',
  route: '/fetch_user_profile',
  doc: {
    summary: '用户主页信息',
    description: '取用户主页的资料与统计。笔记列表见 `userNoteList`。'
  },
  params: zod.object({
    user_id: zod.string().min(1, { error: 'user_id 不能为空' }).describe('用户 ID，从主页地址里取'),
    xsec_token: zod
      .string()
      .optional()
      .describe('反爬令牌，随用户主页分享链接下发；游客必传、有效登录 CK 可省；**与发放它的会话绑定**（游客下换会话即 461）'),
    xsec_source: zod.string().optional().describe('反爬来源，默认 pc_feed；仅在带 xsec_token 时发出')
  }),
  build: (p): RequestSpec => {
    const { Url, apiPath, signParams } = buildUserProfile(p)
    // signParams 透传给签名器：GET 的 x-s 必须覆盖 query，否则平台返回 406
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  sign: [xs('get', 'xys'), traceId()],
  response: type<XiaohongshuUserProfileResponse>()
})
