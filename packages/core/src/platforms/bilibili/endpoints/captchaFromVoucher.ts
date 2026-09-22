import zod from 'zod'

import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 从 v_voucher 申请验证码（POST）。
 *
 * 与旧版一致：`getCaptchaFromVoucher` POST，
 * body 为 `{ csrf?, v_voucher }`，无签名。
 */
export const captchaFromVoucher = defineBilibiliEndpoint({
  name: 'bilibili.captchaFromVoucher',
  route: '/apply_captcha',
  doc: {
    summary: '由 v_voucher 申请的验证码信息',
    description: '人机校验第一步：用 `v_voucher` 换取验证码与校验参数。'
  },
  params: zod.object({
    csrf: zod.string().optional().describe('CSRF Token，取 `bili_jct`'),
    v_voucher: zod.string().min(1, { error: '验证码ID不能为空' }).describe('风控下发的凭证，形如 `voucher_xxx`')
  }),
  build: (p) => {
    const { Url, Body } = bilibiliApiUrls.getCaptchaFromVoucher(p)
    return { method: 'POST', url: Url, body: Body, headers: { 'Content-Type': 'application/json' } }
  },
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<any>()
})
