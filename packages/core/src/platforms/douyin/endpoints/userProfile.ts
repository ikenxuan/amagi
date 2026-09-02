import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 用户主页信息（单请求 + Referer 注入）。
 *
 * 与 v6 的 `userProfile` 一致：`getUserProfile` GET + a_bogus 签名，
 * Referer 指向 `https://www.douyin.com/user/{sec_uid}`（v6 六处内联
 * Referer 注入之一，v7 用 `withDouyinReferer` 共享实现）。
 */
export const userProfile = defineEndpoint({
  name: 'douyin.userProfile',
  route: '/fetch_user_info',
  doc: { summary: '用户主页信息' },
  params: zod.object({
    sec_uid: zod.string().min(1, { error: '用户ID不能为空' })
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getUserProfile(p),
    headers: withDouyinReferer(ctx, { kind: 'user', secUid: p.sec_uid })
  }),
  sign: 'a-bogus',
  response: type<DouyinReturnTypeMap['userProfile']>()
})
