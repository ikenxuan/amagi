import { gzipSync } from 'node:zlib'

import type { EndpointCtx } from '../../../../contracts/endpoint'
import { EndpointError } from '../../../../contracts/error'
import { AmagiHeaders, type RawResponse, type RequestSpec } from '../../../../contracts/request'
import { awemeJudge } from '../judge'
import type { AppCookieJar } from './cookies'
import { completeAppUrl, registrationBody, type AppDevice } from './device'
import { signerEndpointUrl } from './signer-url'

const objectOf = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {})
export const appHeaders = (device: AppDevice, jar: AppCookieJar, url: string): Record<string, string> => ({
  'User-Agent': device.user_agent,
  Accept: 'application/json',
  'Accept-Encoding': 'gzip',
  'sdk-version': '2',
  'x-ss-req-ticket': String(Date.now()),
  'x-tt-request-tag': 't=0;n=0',
  'x-tt-store-region-did': device.device_id,
  ...(device.x_tt_dt ? { 'x-tt-dt': device.x_tt_dt } : {}),
  ...(jar.header(url) ? { Cookie: jar.header(url) } : {})
})
export const signOwnedRequest = async (
  spec: RequestSpec,
  ctx: EndpointCtx,
  signerBaseUrl: string,
  device: AppDevice,
  jar: AppCookieJar
): Promise<RequestSpec> => {
  const url = completeAppUrl(spec.url, device)
  const requestHeaders = new AmagiHeaders(spec.headers)
  requestHeaders.delete('Cookie')
  const headers = requestHeaders.merge(appHeaders(device, jar, url)).toJSON()
  const res = await ctx.send(
    {
      method: 'POST',
      url: signerEndpointUrl(signerBaseUrl, 'sign'),
      complete: true,
      responseType: 'json',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method: spec.method, body: typeof spec.body === 'string' ? spec.body : '', headers, identity: device })
    },
    'prepare'
  )
  const result = objectOf(res.body)
  const signed = objectOf(result.signObject)
  if (
    res.status !== 200 ||
    result.ok !== true ||
    signed.url !== url ||
    signed.method !== spec.method ||
    !signed.headers ||
    typeof signed.headers !== 'object' ||
    Array.isArray(signed.headers) ||
    Object.values(signed.headers).some((value) => typeof value !== 'string')
  ) {
    throw new EndpointError({
      kind: 'unavailable',
      code: 'APP_SIGNER_INVALID_RESPONSE',
      message: '签名服务需支持客户身份协议，且不得改写 amagi 的 URL 或方法'
    })
  }
  const signedHeaders = new AmagiHeaders(signed.headers as Record<string, string>)
  for (const [key, value] of Object.entries(headers)) {
    if (signedHeaders.get(key) !== value)
      throw new EndpointError({ kind: 'unavailable', code: 'APP_SIGNER_INVALID_RESPONSE', message: `签名服务改写了业务请求头 ${key}` })
  }
  return { ...spec, url, headers: signedHeaders.toJSON(), complete: true }
}
export const registerDevice = async (ctx: EndpointCtx, signerBaseUrl: string, device: AppDevice, jar: AppCookieJar): Promise<void> => {
  const compressed = gzipSync(Buffer.from(JSON.stringify(registrationBody(device))))
  const encrypted = await ctx.send(
    {
      method: 'POST',
      url: signerEndpointUrl(signerBaseUrl, 'tt-encrypt'),
      complete: true,
      responseType: 'json',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: compressed.toString('base64') })
    },
    'prepare'
  )
  const value = objectOf(encrypted.body)
  if (encrypted.status !== 200 || value.ok !== true || typeof value.data !== 'string') {
    throw new EndpointError({
      kind: 'unavailable',
      code: 'APP_SIGNER_ERROR',
      message: '签名服务不支持离线 TTEncrypt；设备注册请求必须由 amagi 发起'
    })
  }
  const url = 'https://log.snssdk.com/service/2/device_register/?tt_data=a'
  const response = await ctx.send(
    {
      method: 'POST',
      url,
      complete: true,
      responseType: 'json',
      body: Buffer.from(value.data, 'base64'),
      headers: { 'User-Agent': device.user_agent, 'Content-Type': 'application/octet-stream;tt-data=a', 'log-encode-type': 'gzip' }
    },
    'prepare'
  )
  jar.accept(url, response.setCookie)
  const raw = objectOf(response.body)
  const did = raw.device_id_str ?? raw.device_id
  const iid = raw.install_id_str ?? raw.install_id
  if (response.status !== 200 || !/^[1-9]\d+$/.test(String(did)) || !/^[1-9]\d+$/.test(String(iid))) {
    throw new EndpointError({ kind: 'unavailable', code: 'PLATFORM_ERROR', message: 'App 设备注册未取得有效 device_id/install_id' })
  }
  device.device_id = String(did)
  device.install_id = String(iid)
  if (typeof raw.device_token === 'string') device.x_tt_dt = raw.device_token
}
export const acquireCookies = async (
  ctx: EndpointCtx,
  signerBaseUrl: string,
  device: AppDevice,
  jar: AppCookieJar
): Promise<RawResponse> => {
  const registerUrl = 'https://ttwid.bytedance.com/ttwid/union/register/'
  const response = await ctx.send(
    {
      method: 'POST',
      url: registerUrl,
      complete: true,
      responseType: 'json',
      headers: { ...appHeaders(device, jar, registerUrl), 'Content-Type': 'application/json' },
      body: JSON.stringify({ aid: 1128, service: 'aweme.snssdk.com' })
    },
    'prepare'
  )
  jar.accept(registerUrl, response.setCookie)
  const redirect = objectOf(response.body).redirect_url
  if (typeof redirect !== 'string')
    throw new EndpointError({ kind: 'parse', code: 'EMPTY_RESPONSE', message: '游客 Cookie 注册未返回回调地址' })
  const callback = new URL(redirect)
  if (
    callback.protocol !== 'https:' ||
    callback.hostname !== 'aweme.snssdk.com' ||
    callback.pathname !== '/ttwid/union/register/callback/'
  ) {
    throw new EndpointError({ kind: 'validation', code: 'PARAM_INVALID', message: '游客 Cookie 回调域名或路径不匹配' })
  }
  const returned = await ctx.send(
    {
      method: 'GET',
      url: callback.toString(),
      complete: true,
      responseType: 'json',
      headers: appHeaders(device, jar, callback.toString())
    },
    'prepare'
  )
  jar.accept(callback.toString(), returned.setCookie)
  if (!jar.header('https://aweme.snssdk.com/').includes('ttwid='))
    throw new EndpointError({ kind: 'parse', code: 'EMPTY_RESPONSE', message: '游客 Cookie 回调未下发 ttwid' })
  const activate = completeAppUrl('https://ichannel.snssdk.com/service/2/app_alert_check/', device)
  const activated = await ctx.send(
    { method: 'GET', url: activate, complete: true, responseType: 'json', headers: appHeaders(device, jar, activate) },
    'prepare'
  )
  jar.accept(activate, activated.setCookie)
  const feed = await signOwnedRequest(
    { method: 'GET', url: 'https://aweme.snssdk.com/aweme/v1/feed/?count=1', responseType: 'json' },
    ctx,
    signerBaseUrl,
    device,
    jar
  )
  const seeded = await ctx.send(feed, 'prepare')
  jar.accept(feed.url, seeded.setCookie)
  const verdict = awemeJudge(seeded.body, { status: seeded.status, headers: seeded.headers, responseType: 'json' })
  if (!verdict.ok)
    throw new EndpointError({
      kind: verdict.kind ?? 'unknown',
      code: verdict.code ?? 'PLATFORM_ERROR',
      message: 'App 游客初始化 Feed 请求失败'
    })
  return seeded
}
