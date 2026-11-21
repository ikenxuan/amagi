import zod from 'zod'

import type { DouyinAppUserProfileResponse } from '../../../../types/generated'
import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export const userProfile = defineAwemeEndpoint({
  name: 'douyin.appUserProfile',
  route: '/app_fetch_user_info',
  doc: { summary: 'App 用户公开资料', description: '无需账号登录；签名服务自动附带游客 ttwid，不使用 Web Cookie。' },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' }).describe('用户 sec_uid')
  }),
  build: (p) => appRequest('/aweme/v1/user/profile/other/', { sec_user_id: p.sec_uid, source: 0 }, true),
  response: type<DouyinAppUserProfileResponse>()
})
