import zod from 'zod'

import type { BilibiliLoginStatusResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 登录基本信息（单请求）。
 *
 * 与旧版一致：`getLoginStatus` GET，无签名。
 */
export const loginStatus = defineBilibiliEndpoint({
  name: 'bilibili.loginStatus',
  route: '/login_basic_info',
  doc: {
    summary: '登录基本信息',
    description: '取当前账号的登录信息，可用来判断登录凭证是否还有效。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getLoginStatus() }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLoginStatusResponse>()
})
