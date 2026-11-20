import zod from 'zod'

import type { EndpointCtx, SignFn } from '../../../contracts/endpoint'
import { EndpointError } from '../../../contracts/error'
import { AmagiHeaders, type RequestSpec } from '../../../contracts/request'
import { signerEndpointUrl } from './guest/signer-url'

const signedResponse = zod.object({
  ok: zod.literal(true),
  signObject: zod.object({
    url: zod.url(),
    method: zod.enum(['GET', 'POST']),
    headers: zod.record(zod.string().min(1), zod.string())
  })
})

/** 在 prepare 阶段检查配置；缺配置不触发任何网络请求。 */
export const requireAppSigner = async (ctx: EndpointCtx): Promise<Partial<EndpointCtx>> => {
  const value = ctx.douyinApp?.signerBaseUrl?.trim() ?? ''
  if (!value)
    throw new EndpointError({
      kind: 'validation',
      code: 'APP_SIGNER_NOT_CONFIGURED',
      message: '未配置抖音 App 签名服务地址，请设置 douyin.app.signerBaseUrl'
    })
  try {
    signerEndpointUrl(value, 'sign')
  } catch {
    throw new EndpointError({
      kind: 'validation',
      code: 'PARAM_INVALID',
      message: 'douyin.app.signerBaseUrl 必须是无路径、查询或凭据的 HTTP(S) 站点地址'
    })
  }
  await ctx.douyinAppSession?.ensure(ctx)
  return { cookie: '' }
}

/** 每页均调用一次签名器，之后原样发送最终 URL 和完整头。 */
export const signAppRequest: SignFn = async (spec, ctx): Promise<RequestSpec> => {
  if (ctx.douyinAppSession) return ctx.douyinAppSession.sign(spec, ctx)
  const res = await ctx.send(
    {
      method: 'POST',
      url: signerEndpointUrl(ctx.douyinApp!.signerBaseUrl!.trim(), 'sign'),
      complete: true,
      responseType: 'json',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        url: spec.url,
        method: spec.method,
        body: typeof spec.body === 'string' ? spec.body : '',
        headers: spec.headers ?? {},
        scene: 2,
        appendCommonParams: true,
        includeCookie: spec.extra?.guestCookie === true
      })
    },
    'prepare'
  )
  if (res.status < 200 || res.status >= 300) {
    throw new EndpointError({ kind: 'unavailable', code: 'APP_SIGNER_ERROR', message: `抖音 App 签名服务返回 HTTP ${res.status}` })
  }
  const parsed = signedResponse.safeParse(res.body)
  if (!parsed.success)
    throw new EndpointError({ kind: 'unavailable', code: 'APP_SIGNER_INVALID_RESPONSE', message: '抖音 App 签名服务返回了无效的签名对象' })
  const signed = parsed.data.signObject
  const expected = new URL(spec.url)
  const actual = new URL(signed.url)
  if (
    actual.origin !== expected.origin ||
    actual.pathname !== expected.pathname ||
    signed.method !== spec.method ||
    actual.username ||
    actual.password ||
    actual.hash ||
    [...expected.searchParams].some(
      ([key, value]) =>
        actual.searchParams.getAll(key).join('\0') !== expected.searchParams.getAll(key).join('\0') ||
        !actual.searchParams.getAll(key).includes(value)
    )
  ) {
    throw new EndpointError({
      kind: 'unavailable',
      code: 'APP_SIGNER_INVALID_RESPONSE',
      message: '抖音 App 签名对象改写了业务地址、方法或参数'
    })
  }
  return {
    ...spec,
    url: signed.url,
    method: signed.method,
    headers: new AmagiHeaders(spec.headers).merge(signed.headers).toJSON(),
    complete: true
  }
}
