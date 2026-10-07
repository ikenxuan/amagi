import type { EndpointCtx } from '../../contracts/endpoint'
import { AmagiHeaders, type HeadersInput, type RawResponse, type RequestConfig, type RequestSpec } from '../../contracts/request'
import { DEFAULT_UA } from '../../contracts/ua'
import { cleanUserAgent, HttpClient } from '../../transport/client'

/** 凭据请求与 API 请求走同一套 transport/代理/adapter。 */
export interface DouyinCredentialRequestOptions {
  send?: EndpointCtx['send']
  requestConfig?: RequestConfig
  userAgent?: string
  timeoutMs?: number
}

export const credentialUserAgent = (options: DouyinCredentialRequestOptions): string =>
  cleanUserAgent(options.userAgent ?? new AmagiHeaders(options.requestConfig?.headers as HeadersInput).get('user-agent') ?? DEFAULT_UA)

/** 按 transport 作用域的对象身份区分，避免设备状态在不同客户端/代理之间共享。 */
const scopes = new WeakMap<object, number>()
let nextScope = 0
const scopeId = (scope: object | undefined): number => {
  if (!scope) return 0
  let key = scopes.get(scope)
  if (key === undefined) {
    key = ++nextScope
    scopes.set(scope, key)
  }
  return key
}

export const credentialScope = (options: DouyinCredentialRequestOptions): string => {
  if (!options.send && !options.requestConfig) return 'default'
  // 两个身份都要算：同一个 sender 可能把请求分发到多个代理。
  // 只有 WeakMap 持有对象引用；缓存键里只放它们的数字编号。
  return `${scopeId(options.send)}:${scopeId(options.requestConfig)}`
}

export const sendCredentialRequest = (
  options: DouyinCredentialRequestOptions,
  spec: RequestSpec,
  defaultTimeout: number
): Promise<RawResponse> => {
  const requestConfig: RequestConfig = {
    ...options.requestConfig,
    timeout: options.timeoutMs ?? options.requestConfig?.timeout ?? defaultTimeout,
    maxRedirects: 0,
    /*
     * 握手要读整页 HTML，上限必须留足余量。
     *
     * 2026-10-05 实测：过完 acrawler 挑战后的首页响应在 0.90MB ~ 1.06MB（UTF-8 **字节**）
     * 之间浮动。上限按字节算，页面里有中文，字节数比字符数多约 1.7% —— 按字符数看
     * （最大 1,039,434）都在 1MiB 以内，按字节看（1,051,436 / 1,054,771）就超了。
     * 原来的 1MiB 上限正好卡在这个区间里 —— 三次里约两次抛
     * `maxContentLength size of 1048576 exceeded`，`doMint` 捕获后回 null，
     * 于是拿不到 `UIFID_TEMP`，签名层就发不出 `uifid`，受保护端点直接 403。
     * 症状看着像签名算错，其实是这一行把凭据握手掐断了。
     *
     * 8MB 只是给这页留出量级上的余量，不是按某个具体字节数定的；
     * 挑战脚本本身另有 512KB 上限（见 `guestChallenge.ts`），不依赖这里。
     */
    maxContentLength: 8 * 1024 * 1024,
    responseType: 'text'
  }
  const headers = new AmagiHeaders(spec.headers).set('user-agent', credentialUserAgent(options))
  const request = { ...spec, headers }
  if (options.send) return options.send(request, 'prepare', requestConfig)
  const http = new HttpClient({ requestConfig, retry: { maxRetries: 0 } })
  return http.send(request, 'prepare')
}
