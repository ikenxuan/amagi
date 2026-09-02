import type { AnyEndpointDef, DataOf, InputOf, Registry } from '../contracts/endpoint'
import type { Platform } from '../contracts/platform'
import type { RequestConfig } from '../contracts/request'
import type { AmagiResult } from '../contracts/result'
import { callEndpoint, type HasRequiredKeys, methodNameFor, type MethodNameOfEndpoint } from './fetcher'
import { makeClientCtx } from './runtime'

/**
 * 从 registry 派生「静态」fetcher（v6 的 `douyinFetcher.fetchVideoWork(o, ck, cfg)` 形态）。
 *
 * 与 `client/fetcher.ts` 的 `createFetcherFromRegistry`（绑定形态，cookie 在
 * ctx 里、方法签名 `(options, requestConfig?)`）的差别：静态形态**不绑定**，
 * cookie 是第二参、按次传递 —— v6 顶层 `amagi.douyinFetcher` 就是这个签名。
 * 阶段 6 起 v6 的逐方法手写实现（各平台的 api.ts，内部走 getdata）被这个
 * 派生取代：方法集合自动跟随 registry，方法与 client 上的 fetcher 走同一条
 * 执行管线、同一套信封。
 *
 * 运行期同样是 Proxy 实现（ownKeys / in / 属性访问都反映当前 registry），
 * 与 `createFetcherFromRegistry` 的差异只在「每次调用现场造一个带该次
 * cookie 的 ctx」——静态形态没有实例级绑定，签名器状态因此是每次调用独立
 * 的（v6 静态 fetcher 的签名状态同样是每次现取，06-migration #40-43 的
 * 「签名状态随实例」只约束 client 形态）。
 */

/**
 * 静态 fetcher 方法签名：`(options, cookie?, requestConfig?)`。
 *
 * 默认返回类型来自端点声明的 `response` / `normalize` / `compute`，
 * 显式泛型 `fetchX<T>()` 覆盖（typeMode 逃生舱的替代）。
 */
export type StaticFetcherMethod<D extends AnyEndpointDef> = HasRequiredKeys<InputOf<D>> extends never
  ? <TData = DataOf<D>>(options?: InputOf<D>, cookie?: string, requestConfig?: RequestConfig) => Promise<AmagiResult<TData>>
  : <TData = DataOf<D>>(options: InputOf<D>, cookie?: string, requestConfig?: RequestConfig) => Promise<AmagiResult<TData>>

/**
 * 静态 fetcher 的类型：键是 v6 方法名（查不到表的假端点退化为规则名），
 * 值是三参方法签名。
 */
export type StaticFetcherOf<P extends Platform, R extends Registry> = {
  [K in keyof R as MethodNameOfEndpoint<P, K & string>]: StaticFetcherMethod<R[K]>
}

/**
 * 造一个静态 fetcher（Proxy 实现）。
 * @param platform - 平台
 * @param registry - 该平台的端点注册表
 * @returns 静态形态的 fetcher，方法签名 `(options, cookie?, requestConfig?)`
 */
export const createStaticFetcher = <P extends Platform, R extends Registry>(platform: P, registry: R): StaticFetcherOf<P, R> => {
  const proxy = new Proxy({} as Record<string, unknown>, {
    get: (target, prop) => {
      if (typeof prop !== 'string' || prop === 'then') return undefined
      if (target[prop] !== undefined) return target[prop]
      for (const [endpoint, def] of Object.entries(registry)) {
        if (methodNameFor(platform, endpoint) === prop) {
          // 静态形态**不支持** `debug`（`error.raw`）：方法签名是 v6 冻结的
          // `(options, cookie?, requestConfig?)`，三个位置都有既定含义，塞不下
          // 第四个开关，而 `requestConfig` 是原样透传给 axios 的请求配置，
          // 往里混一个 amagi 自己的开关会让那个类型不再是「axios 配置」。
          // 需要原始响应体请用 client 形态：`createClient({ debug: true })`。
          // 事件同理不接（静态调用没有实例总线，见 runtime/events.ts 的
          // defaultEventBus 说明）。
          const fn = (options?: unknown, cookie?: string, requestConfig?: RequestConfig) =>
            callEndpoint(def, makeClientCtx(platform, cookie ?? '', requestConfig, `static-${platform}`), options)
          target[prop] = fn
          return fn
        }
      }
      return undefined
    },
    ownKeys: () => Object.keys(registry).map((endpoint) => methodNameFor(platform, endpoint)),
    getOwnPropertyDescriptor: (target, prop) => {
      if (typeof prop !== 'string') return undefined
      if (prop === 'then') return undefined
      for (const [endpoint] of Object.entries(registry)) {
        if (methodNameFor(platform, endpoint) === prop) {
          return { configurable: true, enumerable: true, writable: true, value: target[prop] }
        }
      }
      return undefined
    },
    has: (_target, prop) => {
      if (typeof prop !== 'string') return false
      for (const [endpoint] of Object.entries(registry)) {
        if (methodNameFor(platform, endpoint) === prop) return true
      }
      return false
    }
  })

  return proxy as unknown as StaticFetcherOf<P, R>
}
