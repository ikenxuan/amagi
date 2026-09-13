import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliLoginStatusResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 登录基本信息（单请求）。
 *
 * 与旧版一致：`getLoginStatus` GET，无签名。
 */
export const loginStatus = defineEndpoint({
  name: 'bilibili.loginStatus',
  route: '/login_basic_info',
  doc: { summary: '登录基本信息' },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getLoginStatus() }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLoginStatusResponse>()
})
