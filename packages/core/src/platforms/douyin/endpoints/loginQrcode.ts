import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import { douyinApiUrls } from '../api'
import { aBogus, secsdk } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

/**
 * 登录二维码（单请求）。
 *
 * 与旧版一致：`getLoginQrcode` GET + a_bogus 签名。
 * 方法名不规则：底层方法叫 `requestLoginQrcode`。
 *
 * 映射条目 `DyLoginQrcode` 是本端点的**原始响应**，与 `DyPassportQrcode`
 * （登录状态机归一化后的形状，runtime/session 用）不是一回事。
 */
export const loginQrcode = defineDouyinEndpoint({
  name: 'douyin.loginQrcode',
  route: '/fetch_login_qrcode',
  doc: {
    summary: '登录二维码',
    description: '创建登录二维码，返回二维码内容与票据；扫码后的登录状态不在这条。'
  },
  params: zod.object({
    verify_fp: zod.string().min(1, { error: '验证指纹不能为空' }).describe('设备验证指纹')
  }),
  build: (p): RequestSpec => ({ method: 'GET', url: douyinApiUrls.getLoginQrcode(p) }),
  sign: [aBogus(), secsdk()],
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  response: type<any>()
})
