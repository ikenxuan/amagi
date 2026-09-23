import zod from 'zod'

import type { BilibiliLoginQrcodeResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 申请登录二维码（单请求）。
 *
 * 与旧版一致：`getLoginQrcode` GET，无签名。
 */
export const loginQrcode = defineBilibiliEndpoint({
  name: 'bilibili.loginQrcode',
  route: '/new_login_qrcode',
  doc: {
    summary: '登录二维码',
    description: '扫码登录第一步：返回二维码内容与轮询凭据 `qrcode_key`。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getLoginQrcode() }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliLoginQrcodeResponse>()
})
