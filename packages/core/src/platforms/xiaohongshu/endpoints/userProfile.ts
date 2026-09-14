import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { XiaohongshuUserProfileResponse } from '../../../types/generated'
import { userProfile as buildUserProfile } from '../api'

/**
 * 用户信息（GET）。
 *
 * 请求的是 `www.xiaohongshu.com/user/profile/{user_id}` HTML 页面，
 * 从 `window.__INITIAL_STATE__` 里解析。HTML 解析放在 `decode`：拿不到
 * `__INITIAL_STATE__`（风控页或页面结构变化）时抛错，管线映射为 `kind: 'parse'`。
 */
export const userProfile = defineEndpoint({
  name: 'xiaohongshu.userProfile',
  route: '/fetch_user_profile',
  doc: {
    summary: '用户主页信息',
    description:
      '请求的是 `www.xiaohongshu.com/user/profile/{user_id}` 的 HTML 页面（不是 JSON 接口），从 `window.__INITIAL_STATE__` 里解析 `user.userPageData`；' +
      '拿不到就抛错（风控页或页面结构变化），管线会把它归为 `parse` 类的解析失败。' +
      '签名路径用的是 `/api/sns/web/v1/user/otherinfo`，与实际请求的页面地址无关。'
  },
  params: zod.object({
    user_id: zod.string().min(1, { error: 'user_id 不能为空' }).describe('用户 ID；出现在主页地址 `/user/profile/{user_id}` 里')
  }),
  build: (p) => {
    const { Url, apiPath } = buildUserProfile(p)
    return { method: 'GET', url: Url, signPath: apiPath, responseType: 'text' }
  },
  sign: 'xhs-get',
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

/**
 * 用户信息响应（decode 后：`{ code: 0, data: pageData, msg: 'success' }`）。
 *
 * 不复用 `XiaohongshuReturnTypeMap['userProfile']`：映射条目的
 * `basicInfo` 是驼峰，实测载荷是下划线 `basic_info`。
 */
export interface UserProfileData {
  code: number
  msg: string
  success: boolean
  data: {
    basic_info?: { user_id: string; nickname: string; avatar: string }
    [key: string]: unknown
  }
}
