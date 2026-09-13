import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliLoginQrcodeResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 申请登录二维码（单请求）。
 *
 * 与旧版一致：`getLoginQrcode` GET，无签名。
 */
export const loginQrcode = defineEndpoint({
  name: 'bilibili.loginQrcode',
  route: '/new_login_qrcode',
  doc: { summary: '登录二维码' },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getLoginQrcode() }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLoginQrcodeResponse>()
})
