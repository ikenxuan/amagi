import axios, { AxiosError, mergeConfig, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'

import type { Platform } from '../../contracts/platform'
import type { AmagiRequestOptions } from '../../contracts/request'
import type { AmagiResult } from '../../contracts/result'
import type { ClientCtx } from '../fetcher'
import { createAmagiAdapter } from './adapter'

/**
 * `client.<平台>.request` 的入参。
 *
 * 在 axios 配置之上做两处**收窄**，都是为了让「不可能发生的事」编译不过：
 * - 去掉 `adapter` —— 传它就会绕过签名与信封，直达网络。
 * - `responseType` 收成 transport 支持的三种。axios 还认 `'blob'` / `'stream'` /
 *   `'document'`，但那几种解析出来的东西装不进 `RawResponse.body`。
 */
export interface AmagiRequestConfig extends Omit<AxiosRequestConfig, 'responseType' | 'adapter'> {
  /** transport 支持的响应形态 */
  responseType?: 'json' | 'text' | 'arraybuffer'
  /** amagi 专属的单次选项 */
  amagi?: AmagiRequestOptions
}

/** 单次调用（信封轨） */
export type AmagiRequestMethod = <T = unknown>(url: string, config?: AmagiRequestConfig) => Promise<AmagiResult<T>>

/**
 * axios 轨。
 *
 * 与信封轨共用同一个实例、同一套 `defaults` / `interceptors` —— 差别只有一处：
 * 失败的判据是「信封是不是失败信封」时，这里**抛**而不是返回。
 * `data` 的类型是 `AmagiResult<T>` 而不是平台载荷：信封是这次调用真正的产物。
 */
export interface AmagiAxiosTrack {
  /** 发一次请求 */
  request<T = unknown>(config: AmagiRequestConfig): Promise<AxiosResponse<AmagiResult<T>>>
  /** GET */
  get<T = unknown>(url: string, config?: AmagiRequestConfig): Promise<AxiosResponse<AmagiResult<T>>>
  /** DELETE */
  delete<T = unknown>(url: string, config?: AmagiRequestConfig): Promise<AxiosResponse<AmagiResult<T>>>
  /** POST */
  post<T = unknown>(url: string, config?: AmagiRequestConfig): Promise<AxiosResponse<AmagiResult<T>>>
  /** PUT */
  put<T = unknown>(url: string, config?: AmagiRequestConfig): Promise<AxiosResponse<AmagiResult<T>>>
  /** PATCH */
  patch<T = unknown>(url: string, config?: AmagiRequestConfig): Promise<AxiosResponse<AmagiResult<T>>>
}

/**
 * 平台的请求模块。
 *
 * 打的是**任何 URL**（包括 amagi 还没收录的接口），自动带上实例 ck 与平台签名，
 * 走与 fetcher 同一条 `execute` 管线与同一套 judge。与 fetcher 的分工：
 * fetcher 打已声明的端点（有参数校验 / 翻页 / decode / normalize），
 * request 打裸请求（给原始载荷，不跑 decode）。
 */
export interface AmagiRequest {
  /** 发一次请求，返回信封（永不 reject） */
  request<T = unknown>(config: AmagiRequestConfig): Promise<AmagiResult<T>>
  /** GET，返回信封 */
  get: AmagiRequestMethod
  /** DELETE，返回信封 */
  delete: AmagiRequestMethod
  /** POST，返回信封 */
  post: AmagiRequestMethod
  /** PUT，返回信封 */
  put: AmagiRequestMethod
  /** PATCH，返回信封 */
  patch: AmagiRequestMethod
  /** 原生 axios 语义的那一轨 */
  axios: AmagiAxiosTrack
  /** 派生一份改了默认值的模块（axios 的 `create`，`amagi` 默认值会**深合并**） */
  create(config?: AmagiRequestConfig): AmagiRequest
  /** 底层 axios 实例的默认值，可按 axios 的习惯就地改 */
  defaults: AxiosInstance['defaults']
  /** 底层 axios 实例的拦截器。两条轨共用同一份 */
  interceptors: AxiosInstance['interceptors']
}

/** 两条轨共用的方法名。轨不同，只是失败时抛不抛 */
const METHODS = ['get', 'delete', 'post', 'put', 'patch'] as const

/**
 * 造一个平台的请求模块。
 * @param platform - 平台
 * @param ctx - 平台运行期上下文（含绑定 ck、transport、签名器、judge）
 * @param options - 模块级默认值（`create` 派生时用）
 * @returns 请求模块
 */
export const createRequestModule = (
  platform: Platform,
  ctx: ClientCtx,
  options: { defaults?: AmagiRequestConfig; amagi?: AmagiRequestOptions } = {}
): AmagiRequest => {
  const amagiDefaults = options.amagi ?? {}
  let instance: AxiosInstance
  const adapter = createAmagiAdapter(platform, ctx, () => instance, amagiDefaults)

  // transformRequest / transformResponse 换恒等函数：**防序列化跑两遍**。
  // 外层 axios 若把对象 body JSON 化，快手签名器拿到的就是字符串 ——
  // 它自己 `JSON.stringify(payload.requestBody)`，收到字符串会静默签错。
  // 序列化交给内层 axios（transport）做，那才是真正发请求的人。
  //
  // 这个换法的**副作用**在 adapter 侧被抵掉了：恒等函数不设 Content-Type，于是
  // axios 的 dispatchRequest 会给每个 POST/PUT/PATCH 补一个
  // `application/x-www-form-urlencoded`（`setContentType(..., false)`，没设过才补），
  // 而那个头会盖掉平台基线里正确的值。`adapter.ts` 的 `toRequestConfig` 负责把它删掉，
  // 让平台基线（快手 `application/json`、小红书带 charset）说了算 —— 见那边的注释。
  // 所以这里**不要**为了让 axios 设个头而改回默认 transform。
  //
  // 调用方显式给了 transform 就用它自己的（这是合法的 axios 旋钮）；
  // `adapter` 永远是我们这个，放最后。
  //
  // 类型上要局部把 `adapter` 加回来一次：`AmagiRequestConfig` 的 Omit 是给调用方看的
  // （挡住他传 adapter 绕开签名），代价是这个字面量写不下**我们自己的**这一个
  const base: AmagiRequestConfig & { adapter: typeof adapter } = {
    transformRequest: [(data: unknown) => data],
    transformResponse: [(data: unknown) => data],
    ...(options.defaults ?? {}),
    adapter
  }
  delete base.amagi

  instance = axios.create(base as AxiosRequestConfig)

  /** 去掉运行期混进来的 adapter：类型挡住了 `as any` 与 JS 调用方挡不住 */
  const sanitize = (config?: AmagiRequestConfig): AmagiRequestConfig | undefined => {
    if (config === undefined || !('adapter' in config)) return config
    const { adapter: _adapter, ...rest } = config as AmagiRequestConfig & { adapter?: unknown }
    return rest
  }

  const envelopeCall = <T>(invoke: () => Promise<AxiosResponse>): Promise<AmagiResult<T>> =>
    invoke().then((res) => res.data as AmagiResult<T>)

  const axiosCall = async (invoke: () => Promise<AxiosResponse>): Promise<AxiosResponse> => {
    const res = await invoke()
    const envelope = res.data as AmagiResult<unknown>
    if (envelope.success) return res
    throw new AxiosError(
      envelope.error.message,
      envelope.error.code,
      res.config,
      res.request,
      // status 0 = 这次调用根本没拿到响应（见 adapter 的 toAxiosResponse）
      res.status === 0 ? undefined : res
    )
  }

  const envelopeTrack: Record<string, unknown> = {}
  const axiosTrack: Record<string, unknown> = {}
  for (const name of METHODS) {
    envelopeTrack[name] = (url: string, config?: AmagiRequestConfig) => envelopeCall(() => instance[name](url, sanitize(config)))
    axiosTrack[name] = (url: string, config?: AmagiRequestConfig) => axiosCall(() => instance[name](url, sanitize(config)))
  }
  envelopeTrack.request = (config: AmagiRequestConfig) => envelopeCall(() => instance.request(sanitize(config) ?? {}))
  axiosTrack.request = (config: AmagiRequestConfig) => axiosCall(() => instance.request(sanitize(config) ?? {}))

  return {
    ...(envelopeTrack as Pick<AmagiRequest, 'request' | 'get' | 'delete' | 'post' | 'put' | 'patch'>),
    axios: axiosTrack as unknown as AmagiAxiosTrack,
    defaults: instance.defaults,
    interceptors: instance.interceptors,
    create: (config) =>
      createRequestModule(platform, ctx, {
        defaults: mergeConfig(instance.defaults as AxiosRequestConfig, (config ?? {}) as AxiosRequestConfig) as AmagiRequestConfig,
        // `amagi` 手动深合并：axios 的 mergeConfig 对未知键是整对象替换
        amagi: { ...amagiDefaults, ...(config?.amagi ?? {}) }
      })
  }
}
