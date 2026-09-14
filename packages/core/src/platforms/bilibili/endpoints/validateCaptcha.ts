import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 验证验证码结果（POST）。
 *
 * 与旧版一致：`validateCaptcha` POST，
 * body 为 `{ challenge, token, validate, seccode, csrf? }`，无签名。
 */
export const validateCaptcha = defineEndpoint({
  name: 'bilibili.validateCaptcha',
  route: '/validate_captcha',
  doc: {
    summary: '验证码校验结果',
    description:
      '风控人机校验的第二步：把上一步拿到的 `challenge` / `token` 与极验回调给出的 `validate` / `seccode` 一起 POST 到 `x/gaia-vgate/v1/validate`，通过后本次风控才算解除。POST JSON、无签名。'
  },
  params: zod.object({
    csrf: zod.string().optional().describe('CSRF Token，取 Cookie 里的 `bili_jct`'),
    challenge: zod.string().min(1, { error: '验证码challenge不能为空' }).describe('极验的 `challenge`，由 `captchaFromVoucher` 返回'),
    token: zod.string().min(1, { error: '验证码token不能为空' }).describe('极验的 `token`，由 `captchaFromVoucher` 返回'),
    validate: zod.string().min(1, { error: '验证码validate不能为空' }).describe('人机验证通过后由极验回填的 `validate`'),
    seccode: zod
      .string()
      .min(1, { error: '验证码seccode不能为空' })
      .describe('人机验证通过后由极验回填的 `seccode`，形如 `{validate}|jordan`')
  }),
  build: (p) => {
    const { Url, Body } = bilibiliApiUrls.validateCaptcha(p)
    return { method: 'POST', url: Url, body: Body, headers: { 'Content-Type': 'application/json' } }
  },
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<any>()
})
