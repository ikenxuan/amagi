import zod from 'zod'

import type { DouyinUserProfileResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'
import { defineDouyinEndpoint, type } from './define'

/**
 * 用户主页信息（单请求 + Referer 注入）。
 *
 * 与旧版一致：`getUserProfile` GET + a_bogus 签名，
 * Referer 指向 `https://www.douyin.com/user/{sec_uid}`（由 {@link withDouyinReferer} 注入）。
 */
export const userProfile = defineDouyinEndpoint({
  name: 'douyin.userProfile',
  route: '/fetch_user_info',
  doc: {
    summary: '用户主页信息',
    description: '只认 `sec_uid`；手里只有抖音号时先用 `guestUserInfo` 换。'
  },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }).describe('用户 sec_uid，主页链接里那段')
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getUserProfile(p),
    headers: withDouyinReferer(ctx, { kind: 'user', secUid: p.sec_uid })
  }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinUserProfileResponse>()
})
