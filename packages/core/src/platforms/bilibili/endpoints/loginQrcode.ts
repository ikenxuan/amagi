import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 申请登录二维码（单请求）。
 *
 * 与 v6 的 `loginQrcode` 一致：`getLoginQrcode` GET，无签名。
 */
export const loginQrcode = defineEndpoint({
  name: 'bilibili.loginQrcode',
  route: '/new_login_qrcode',
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getLoginQrcode() }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<LoginQrcodeData>()
})

/** 登录二维码响应（与 v6 形状一致的最小声明） */
export interface LoginQrcodeData {
  code?: number
  data?: {
    url?: string
    qrcode_key?: string
    [key: string]: unknown
  }
  message?: string
  [key: string]: unknown
}
