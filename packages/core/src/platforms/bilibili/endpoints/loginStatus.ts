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
  doc: {
    summary: '登录基本信息',
    description:
      '`x/web-interface/nav`：判断 cookie 还有没有效（未登录回 `-101`，判 `auth` / `COOKIE_EXPIRED`，空响应体也归这一类），顺带返回 wbi keys（`wbi_img`）—— ' +
      '`wbi` / `qtparam` 签名器第一次签名时打的就是这个接口，keys 在 30 分钟内复用缓存。无参数、无签名。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getLoginStatus() }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLoginStatusResponse>()
})
