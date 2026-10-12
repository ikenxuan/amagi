import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { XiaohongshuUserProfileResponse } from '../../../types/generated'
import { userProfile as buildUserProfile } from '../api'
import { xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 用户信息（GET）。
 *
 * 请求的是 `www.xiaohongshu.com/user/profile/{user_id}` HTML 页面，从
 * `window.__INITIAL_STATE__` 里解析。**`xsec_token` 游客必传**（随用户主页分享链接下发，
 * 不带它页面只回未水合的空壳 `userPageData={}`）；**有效登录 CK 可省**（省略时 URL 退回
 * v6 形态，不改变已登录用户的既有行为）。HTML 解析放在 `decode`：拿不到 `__INITIAL_STATE__`
 * （风控页或页面结构变化）时抛错，管线映射为 `kind: 'parse'`。
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
      .describe('反爬令牌，随用户主页分享链接下发；游客必传、有效登录 CK 可省；**与发放它的会话绑定**（游客下换会话即 461）')
  }),
  build: (p): RequestSpec => {
    const { Url, apiPath } = buildUserProfile(p)
    return { method: 'GET', url: Url, signPath: apiPath, responseType: 'text' }
  },
  sign: [xs('get', 'xys')],
  decode: (raw) => {
    if (typeof raw !== 'string') return raw
    const match = raw.match(/<script>window\.__INITIAL_STATE__=(.+)<\/script>/m)
    if (!match) throw new Error('用户页面缺少 __INITIAL_STATE__，可能是风控页')
    const json = match[1].replace(/:undefined/g, ':null')
    const info = JSON.parse(json) as { user?: { userPageData?: unknown } }
    const pageData = info.user?.userPageData
    if (pageData === undefined) throw new Error('用户页面缺少 userPageData')
    return { code: 0, success: true, msg: 'success', data: pageData }
  },
  response: type<XiaohongshuUserProfileResponse>()
})
