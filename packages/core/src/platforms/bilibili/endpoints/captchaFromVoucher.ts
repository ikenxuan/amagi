import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 从 v_voucher 申请验证码（POST）。
 *
 * 与 v6 的 `captchaFromVoucher` 一致：`getCaptchaFromVoucher` POST，
 * body 为 `{ csrf?, v_voucher }`，无签名。
 */
export const captchaFromVoucher = defineEndpoint({
  name: 'bilibili.captchaFromVoucher',
  route: '/apply_captcha',
  doc: { summary: '由 v_voucher 申请的验证码信息' },
  params: zod.object({
    csrf: zod.string().optional(),
    v_voucher: zod.string().min(1, { error: '验证码ID不能为空' })
  }),
  build: (p) => {
    const { Url, Body } = bilibiliApiUrls.getCaptchaFromVoucher(p)
    return { method: 'POST', url: Url, body: Body, headers: { 'Content-Type': 'application/json' } }
  },
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['captchaFromVoucher']>()
})
