import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { douyinApiUrls } from '../api'

/**
 * 登录二维码（单请求）。
 *
 * 与 v6 的 `loginQrcode` 一致：`getLoginQrcode` GET + a_bogus 签名。
 * 方法名不规则：`requestLoginQrcode`（v6 用 `request` 前缀，
 * METHOD_NAMES 表已锁）。
 */
export const loginQrcode = defineEndpoint({
  name: 'douyin.loginQrcode',
  route: '/fetch_login_qrcode',
  params: zod.object({
    verify_fp: zod.string().min(1, { error: '验证指纹不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getLoginQrcode(p) }),
  sign: 'a-bogus',
  response: type<LoginQrcodeData>()
})

/** 登录二维码响应（与 v6 形状一致的最小声明） */
export interface LoginQrcodeData {
  data?: {
    qrcode_index_url?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}
