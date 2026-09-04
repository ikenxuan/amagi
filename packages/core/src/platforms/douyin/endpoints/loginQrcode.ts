import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 登录二维码（单请求）。
 *
 * 与 v6 的 `loginQrcode` 一致：`getLoginQrcode` GET + a_bogus 签名。
 * 方法名不规则：`requestLoginQrcode`（v6 用 `request` 前缀，
 * METHOD_NAMES 表已锁）。
 *
 * 映射条目 `DyLoginQrcode` 是本端点的**原始响应**，与 `DyPassportQrcode`
 * （登录状态机归一化后的形状，runtime/session 用）不是一回事。
 */
export const loginQrcode = defineEndpoint({
  name: 'douyin.loginQrcode',
  route: '/fetch_login_qrcode',
  doc: { summary: '登录二维码' },
  params: zod.object({
    verify_fp: zod.string().min(1, { error: '验证指纹不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getLoginQrcode(p) }),
  sign: 'a-bogus',
  response: type<DouyinReturnTypeMap['loginQrcode']>()
})
