import { AxiosHeaders, type AxiosAdapter, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import zod from 'zod'

import { defineEndpoint } from '../../contracts/endpoint'
import type { Platform } from '../../contracts/platform'
import type { AmagiRequestOptions, HttpMethod, RawResponse, RequestConfig, RequestSpec } from '../../contracts/request'
import type { AmagiResult } from '../../contracts/result'
import { type ClientCtx, callEndpoint } from '../fetcher'
import { requestProfileOf, resolveDefaultSign } from './profile'

/**
 * adapter：axios 与 amagi 管线之间唯一的一道缝。
 *
 * 职责三件：把归一化后的 axios 配置翻成 `RequestSpec`；现场合成一个
 * `EndpointDef` 交给 `callEndpoint`；把信封包成 `AxiosResponse` 还给 axios。
 *
 * **不新开执行路径**是这个设计的关键 —— 合成一个一次性端点声明之后，
 * judge / 信封 / 退避重试 / `retryFresh` / 平台 observe（抖音回收 webid）/
 * 事件 / trace 全部由 `runtime/execute.ts` 那条既有管线提供，一行都不用重写。
 * 自己直接调 `HttpClient.send` 会把这些**全部**丢掉，且与端点行为分叉。
 */

/** 合成端点声明的路由占位。它不进任何注册表，所以不会与服务端路由冲突 */
const REQUEST_ROUTE = '/request'

/**
 * **不往下传**给 transport 的 axios 配置键。每一条都有具体理由：
 *
 * - `url` / `method` / `data` —— 它们进 `RequestSpec`，不是「请求配置」。
 * - `params` / `paramsSerializer` / `baseURL` —— **已经序列化进 URL 了**
 *   （`instance.getUri(config)`）。再往下传会被内层 axios 拼第二遍，
 *   变成 `?a=1?a=1` 或 `baseURL` 双前缀。这是本文件最容易踩的坑。
 * - `headers` —— 由调用方经 `toRequestConfig` 重新挂到 `requestConfig.headers`。
 *   不能同时进 `spec.headers`：`ctx.userAgent` 是从 `requestConfig.headers`
 *   读的，而抖音的 `a_bogus` 用的是 `ctx.userAgent` —— 只把 UA 放进
 *   `spec.headers` 会让「签名用的 UA」与「发出去的 UA」不是同一个。
 * - `adapter` —— 传下去就会在**内层** axios 覆盖默认 adapter，等于绕开
 *   签名与信封。类型上 `AmagiRequestConfig` 已经 `Omit` 掉它，这里再做一次
 *   运行期兜底（JS 调用方与 `as any` 挡不住）。
 * - `transformRequest` / `transformResponse` —— 我们为了防「序列化跑两遍」
 *   在**外层**把默认 transform 换成了恒等函数。它们要是漏到 `requestConfig`，
 *   会被 `transport/client.ts` 摊进内层 axios 配置，于是 body 永远不会被
 *   序列化 —— 请求发出去是个空体。
 * - `validateStatus` —— 失败判据由 judge 说了算（业务码 / 风控页 / 空 body
 *   都认，状态码只是其中一层）。放它下去会让内层 axios 对非 2xx 的处理
 *   与判据打架。
 * - `responseType` —— 进 `spec.responseType`。
 * - `amagi` —— 是给 adapter 自己看的。
 */
export const NOT_FORWARDED_KEYS = [
  'url',
  'baseURL',
  'method',
  'data',
  'params',
  'paramsSerializer',
  'headers',
  'adapter',
  'transformRequest',
  'transformResponse',
  'validateStatus',
  'responseType',
  'amagi'
] as const

/**
 * 把 axios 配置翻成 transport 的请求配置（`headers` 重新挂回来）。
 *
 * 留下来的键（`timeout` / `proxy` / `signal` / `maxRedirects` / `httpAgent` …）
 * 会被 `transport/client.ts` 摊进内层 axios 配置 —— 这正是「axios 的键就是
 * axios 的键」的落地方式：调用方写 `timeout` 就是 axios 意义上的 timeout。
 * @param config - axios 归一化后的配置
 * @returns transport 用的请求配置
 */
export const toRequestConfig = (config: InternalAxiosRequestConfig): RequestConfig => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(config)) {
    if ((NOT_FORWARDED_KEYS as readonly string[]).includes(key)) continue
    out[key] = value
  }
  out.headers = (config.headers as AxiosHeaders).toJSON()
  return out as RequestConfig
}

/**
 * 把 axios 配置翻成 `RequestSpec`。
 * @param config - axios 归一化后的配置
 * @param url - `instance.getUri(config)` 的结果：完整 URL，含已序列化的 params
 * @param amagi - 合并后的 amagi 单次选项
 * @returns 请求描述
 */
export const buildRequestSpec = (config: InternalAxiosRequestConfig, url: string, amagi: AmagiRequestOptions): RequestSpec => ({
  method: String(config.method ?? 'get').toUpperCase() as HttpMethod,
  url,
  ...(config.data === undefined ? {} : { body: config.data }),
  ...(config.responseType === undefined ? {} : { responseType: config.responseType as RequestSpec['responseType'] }),
  ...(amagi.signPath === undefined ? {} : { signPath: amagi.signPath }),
  dropHeaders: [...(amagi.dropHeaders ?? []), ...(amagi.cookie === false ? ['cookie'] : [])]
})

/**
 * 现场合成一个一次性的端点声明。
 *
 * `build` 的写法值得说明：`execute` 在 `retryFresh` 重试时会把 `build` **再调一次**
 * （见 `runtime/execute.ts` 的 `rebuildAt`），而我们要的是「第一次给原 spec、
 * 之后每次给刷新过的 spec」。所以这里返回当前值的同时把下一个算好 ——
 * 不用计数器，也就没有「第几次调用」这种隐藏状态。
 * @param platform - 平台
 * @param spec - 本次调用的请求描述
 * @param method - HTTP 方法（小红书按它推默认签名器）
 * @param amagi - 合并后的 amagi 单次选项
 * @returns 可交给 `callEndpoint` 的端点声明
 */
export const makeRequestDef = (platform: Platform, spec: RequestSpec, method: HttpMethod, amagi: AmagiRequestOptions) => {
  const profile = requestProfileOf(platform)
  let current = spec

  return defineEndpoint({
    name: `${platform}.request`,
    route: REQUEST_ROUTE,
    params: zod.object({}),
    build: () => {
      const out = current
      current = profile.refresh ? profile.refresh(spec) : spec
      return out
    },
    sign: amagi.sign ?? resolveDefaultSign(profile, method),
    ...(profile.retryOn === undefined ? {} : { retryOn: profile.retryOn }),
    ...(profile.retryFresh === undefined ? {} : { retryFresh: profile.retryFresh })
  })
}

/**
 * 把信封包成 axios 响应。
 *
 * `status: 0` 是「这次调用根本没拿到响应」（签名器抛错 / 网络中断）的哨兵，
 * 不是自创 —— 浏览器里网络失败时 `xhr.status` 就是 0。axios 轨靠它决定
 * `AxiosError.response` 要不要给。
 * @param config - axios 配置
 * @param data - 管线产出的信封
 * @param raw - 本次调用最后一次真实响应；一次都没拿到就是 `undefined`
 * @returns axios 响应
 */
const toAxiosResponse = (config: InternalAxiosRequestConfig, data: AmagiResult<unknown>, raw?: RawResponse): AxiosResponse => ({
  data,
  status: raw?.status ?? 0,
  statusText: raw?.statusText ?? '',
  headers: AxiosHeaders.from(raw?.headers.toJSON() ?? {}),
  config,
  request: {}
})

/**
 * 造一个 amagi adapter。
 * @param platform - 平台
 * @param ctx - 平台运行期上下文（含绑定 ck 与 transport）
 * @param getInstance - 惰性取 axios 实例（adapter 要用它的 `getUri`，而实例构造时要先有 adapter）
 * @param amagiDefaults - 模块级的 amagi 默认选项，单次调用里同名字段覆盖它
 * @returns axios adapter
 */
export const createAmagiAdapter =
  (platform: Platform, ctx: ClientCtx, getInstance: () => AxiosInstance, amagiDefaults: AmagiRequestOptions): AxiosAdapter =>
  async (config) => {
    // `amagi` 是 amagi 自己的键（公开面由 `AmagiRequestConfig` 声明），而这里拿到的
    // 是 axios 归一化后的 `InternalAxiosRequestConfig`，读它得先断言一次
    const perCall = config as InternalAxiosRequestConfig & { amagi?: AmagiRequestOptions }
    // `amagi` 走闭包合并而不是交给 axios 的 mergeConfig：后者对未知键是
    // **整对象替换**，于是派生模块设的 `cookie: false` 会被一次 per-call 的
    // `amagi: { sign }` 整个冲掉
    const amagi: AmagiRequestOptions = { ...amagiDefaults, ...perCall.amagi }
    const method = String(config.method ?? 'get').toUpperCase() as HttpMethod
    const spec = buildRequestSpec(config, getInstance().getUri(config), amagi)

    // 信封里**没有** HTTP 状态（成功信封没有这个字段，也不该有），而 axios 轨的
    // `AxiosResponse.status` 必须有它。借平台的 `observe` 钩子抓一次真实响应 ——
    // 它每次 send 之后都被调一次，本来就在 `PLATFORM_RUNTIME` 里装着，
    // 而且抖音的 webid 回收要靠它，所以只能包一层、不能替换
    let last: RawResponse | undefined
    const captureCtx: ClientCtx = {
      ...ctx,
      observe: (res, inner) => {
        last = res
        ctx.observe?.(res, inner)
      }
    }

    const result = await callEndpoint(makeRequestDef(platform, spec, method, amagi), captureCtx, {}, toRequestConfig(config))
    return toAxiosResponse(config, result, last)
  }
