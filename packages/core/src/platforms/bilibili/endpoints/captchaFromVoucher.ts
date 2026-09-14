import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 从 v_voucher 申请验证码（POST）。
 *
 * 与旧版一致：`getCaptchaFromVoucher` POST，
 * body 为 `{ csrf?, v_voucher }`，无签名。
 */
export const captchaFromVoucher = defineEndpoint({
  name: 'bilibili.captchaFromVoucher',
  route: '/apply_captcha',
  doc: {
    summary: '由 v_voucher 申请的验证码信息',
    description:
      '风控人机校验的第一步：把 `v_voucher` POST 到 `x/gaia-vgate/v1/register`，换出验证码与后续要用的 `challenge` / `token`。第二步用 `validateCaptcha` 提交用户过完验证的结果。POST JSON、无签名。'
  },
  params: zod.object({
    csrf: zod.string().optional().describe('CSRF Token，取 Cookie 里的 `bili_jct`'),
    v_voucher: zod.string().min(1, { error: '验证码ID不能为空' }).describe('风控下发的凭证，形如 `voucher_` 后跟一串以 `-` 分隔的小写 UUID')
  }),
  build: (p) => {
    const { Url, Body } = bilibiliApiUrls.getCaptchaFromVoucher(p)
    return { method: 'POST', url: Url, body: Body, headers: { 'Content-Type': 'application/json' } }
  },
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<any>()
})
