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
    description: '人机校验第二步：提交 `challenge` / `token` 与用户过完验证的结果。'
  },
  params: zod.object({
    csrf: zod.string().optional().describe('CSRF Token，取 `bili_jct`'),
    challenge: zod.string().min(1, { error: '验证码challenge不能为空' }).describe('极验 challenge，第一步返回'),
    token: zod.string().min(1, { error: '验证码token不能为空' }).describe('极验 token，第一步返回'),
    validate: zod.string().min(1, { error: '验证码validate不能为空' }).describe('人机验证通过后回填'),
    seccode: zod.string().min(1, { error: '验证码seccode不能为空' }).describe('人机验证通过后回填的校验串')
  }),
  build: (p) => {
    const { Url, Body } = bilibiliApiUrls.validateCaptcha(p)
    return { method: 'POST', url: Url, body: Body, headers: { 'Content-Type': 'application/json' } }
  },
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<any>()
})
