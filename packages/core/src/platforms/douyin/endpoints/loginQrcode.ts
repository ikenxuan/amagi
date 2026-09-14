import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { douyinApiUrls } from '../api'

/**
 * 登录二维码（单请求）。
 *
 * 与旧版一致：`getLoginQrcode` GET + a_bogus 签名。
 * 方法名不规则：底层方法叫 `requestLoginQrcode`。
 *
 * 映射条目 `DyLoginQrcode` 是本端点的**原始响应**，与 `DyPassportQrcode`
 * （登录状态机归一化后的形状，runtime/session 用）不是一回事。
 */
export const loginQrcode = defineEndpoint({
  name: 'douyin.loginQrcode',
  route: '/fetch_login_qrcode',
  doc: {
    summary: '登录二维码',
    description:
      '打 `sso.douyin.com/get_qrcode/`，`verify_fp` 同时写进 `verifyFp` 与 `fp` 两个查询参数。' +
      'SDK 侧方法名是不规则的 `requestLoginQrcode`。返回的是二维码创建响应 —— 与登录状态机归一化后的形状不是一回事，别拿它当扫码结果。'
  },
  params: zod.object({
    verify_fp: zod.string().min(1, { error: '验证指纹不能为空' }).describe('设备验证指纹 `verify_fp`（同时写进 `verifyFp` 与 `fp`）')
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getLoginQrcode(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<any>()
})
