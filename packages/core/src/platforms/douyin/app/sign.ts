import type { EndpointCtx, SignFn } from '../../../contracts/endpoint'
import { EndpointError } from '../../../contracts/error'
import type { RequestSpec } from '../../../contracts/request'
import { signerEndpointUrl } from './guest/signer-url'

const requireAppSession = (ctx: EndpointCtx) => {
  const session = ctx.douyinAppSession
  if (!session) throw new EndpointError({ kind: 'internal', code: 'INTERNAL_ERROR', message: '抖音 App 会话未在运行时装配' })
  return session
}

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
  await requireAppSession(ctx).ensure(ctx)
  return { cookie: '' }
}

/** 每页均调用一次签名器，之后原样发送最终 URL 和完整头。 */
export const signAppRequest: SignFn = (spec, ctx): Promise<RequestSpec> => requireAppSession(ctx).sign(spec, ctx)
