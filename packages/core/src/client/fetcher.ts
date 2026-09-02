import type { AnyEndpointDef, DataOf, EndpointCtx, InputOf, Registry, SignFn } from '../contracts/endpoint'
import type { Judge } from '../contracts/error'
import type { AmagiMeta } from '../contracts/meta'
import { STATIC_CLIENT_ID } from '../contracts/meta'
import type { Platform } from '../contracts/platform'
import { AmagiHeaders, type HeadersInput, type RequestConfig } from '../contracts/request'
import type { AmagiResult } from '../contracts/result'
import { defaultRequestId, execute } from '../runtime/execute'
import type { EventBus } from '../runtime/events'
import type { TraceCollector } from '../transport/trace'
import { methodNameOf, type MethodNameOf } from './method-names'

/**
 * 从 registry 派生 fetcher。
 *
 * 一个端点一份声明，其余全部派生 —— fetcher 是派生物之一：方法名来自
 * `client/method-names.ts`（唯一手写表，15 个不规则映射在那张表里），
 * 参数类型与返回类型来自端点声明。
 *
 * 运行时用 Proxy 懒加载：方法集合**自动跟随 registry**，registry 里有什么
 * 端点，fetcher 上就有对应 v6 方法名的函数；`Object.keys` / `in` 同样跟随。
 *
 * 返回的 fetcher 是**绑定**形态：cookie 已随 `ClientCtx` 绑入，方法签名是
 * `(options, requestConfig?)`。单次调用可用 `requestConfig.headers` 里任意大小写的
 * `Cookie` 覆盖绑定 cookie（v6 只认大写 `Cookie`，#23 / #32 的根因）。
 */

/** 参数对象里是否有必填键。用于区分「有参方法」与「无参方法」 */
export type HasRequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T]

/**
 * 单个 fetcher 方法的签名。
 *
 * `TData` 默认取端点声明的 `response` / `normalize` / `compute` 推出的类型，
 * 显式传泛型（`fetchX<T>()`）则覆盖返回类型 —— 这是 `typeMode` 逃生舱的替代。
 *
 * 无参端点（`params: zod.object({})`）的 options 参数可省略。
 */
export type FetcherMethod<D extends AnyEndpointDef> = HasRequiredKeys<InputOf<D>> extends never
  ? <TData = DataOf<D>>(options?: InputOf<D>, requestConfig?: RequestConfig) => Promise<AmagiResult<TData>>
  : <TData = DataOf<D>>(options: InputOf<D>, requestConfig?: RequestConfig) => Promise<AmagiResult<TData>>

/**
 * 静态 fetcher 方法的签名（v6 的 `douyinFetcher.fetchVideoWork(o, ck, cfg)` 形态）。
 *
 * 与绑定形态（{@link FetcherMethod}）的差别：cookie 是第二参、按次传递，
 * 没有绑定的实例配置。v6 静态 fetcher 就是 `(options, cookie?, requestConfig?)`；
 * 阶段 6 起它由 registry 派生，返回 v7 信封，签名三参保持原样。
 */
export type StaticFetcherMethod<D extends AnyEndpointDef> = HasRequiredKeys<InputOf<D>> extends never
  ? <TData = DataOf<D>>(options?: InputOf<D>, cookie?: string, requestConfig?: RequestConfig) => Promise<AmagiResult<TData>>
  : <TData = DataOf<D>>(options: InputOf<D>, cookie?: string, requestConfig?: RequestConfig) => Promise<AmagiResult<TData>>

/**
 * 端点短名 → fetcher 方法名。
 *
 * 优先查 `METHOD_NAMES` 表（15 个不规则映射的唯一出处）；查不到时退化为
 * 「`fetch` + 首字母大写」规则名 —— 与 `test/client/method-names.test.ts`
 * 的 `regularNameOf` 同一规则。假端点（阶段 0 的类型推导验证）因此也能
 * 在 fetcher 上拿到 `fetchFakeEcho` 这样的方法。
 */
export type MethodNameOfEndpoint<P extends Platform, K extends string> =
  MethodNameOf<`${P}.${K}`> extends never ? `fetch${Capitalize<K>}` : MethodNameOf<`${P}.${K}`>

/**
 * 一个平台 fetcher 的类型：键是 v6 方法名（查不到表的假端点退化为规则名），
 * 值是该方法对应的端点方法签名。
 */
export type FetcherOf<P extends Platform, R extends Registry> = {
  [K in keyof R as MethodNameOfEndpoint<P, K & string>]: FetcherMethod<R[K]>
}

/**
 * 一次调用专用的执行资源。
 *
 * `trace` 与事件出口都是**按调用**取的，不是按 ctx 取的 —— ctx 是
 * 「实例 × 平台」一份、跨调用复用的。
 */
export interface CallScope {
  /** 本次调用的 trace 收集器（`attempts` 因此不跨调用累加） */
  trace: TraceCollector
  /** 本次调用的 `send`，已绑好 `http:*` / `network:*` 的事件出口 */
  send: EndpointCtx['send']
}

/**
 * 客户端上下文。
 *
 * 一个 client 实例在「新管线」这半边共享的东西：身份（clientId / cookie /
 * userAgent）、请求配置、transport 的 send，以及可选的签名器表 / 默认 judge /
 * 事件总线 / trace。每个平台一份：cookie 是**该平台**的 cookie。
 *
 * `send` 由 transport 注入，因此 `prepare` 换 guest cookie、取 wbi key
 * 都必须走 transport（修 A5）。
 */
export interface ClientCtx extends EndpointCtx {
  /** 平台签名器表，供 `sign: '<name>'` 查名 */
  signers?: Record<string, SignFn>
  /** 平台默认 judge，端点声明的 `judge` 优先 */
  judge?: Judge
  /** 事件总线。不传则不发事件 */
  bus?: EventBus
  /** trace 收集器。不传则自建（只计数） */
  trace?: TraceCollector
  /**
   * 造一次调用专用的执行资源（独立 trace + 绑好本次调用 meta 的事件出口）。
   *
   * 由 `client/runtime.ts` 的 `makeClientCtx` 提供 —— 只有它持有 `HttpClient`，
   * 也只有它知道该往 `HttpClient.emit` 里塞什么。不提供时退回 `ctx.send` /
   * `ctx.trace`（手搓 ctx 的用例走这条，行为与阶段 9.1 之前一致）。
   */
  scope?: (meta: () => AmagiMeta) => CallScope
  /** 是否把原始响应放进 `error.raw`；由 `ClientOptions.debug` 经 `makeClientCtx` 传下来 */
  debug?: boolean
  /** 时钟，便于测试注入 */
  now?: () => number
  /** requestId 生成器，便于测试注入 */
  requestId?: () => string
  /** 退避等待实现，测试可注入（`retryOn` 重试用） */
  sleep?: (ms: number) => Promise<void>
}

/**
 * 合并绑定 cookie 与单次调用的请求配置，解析出本次调用的有效 cookie。
 *
 * 与 v6 `resolveBoundRequest` 的行为一致（单次配置里显式提供 `headers.Cookie`
 * 时同时替换底层 cookie），差别在**大小写无关**：借 `AmagiHeaders` 找 cookie，
 * `Cookie` / `cookie` / `COOKIE` 都能覆盖。
 *
 * cookie 头本身不在这一层写 —— 执行期可能换 cookie（小红书 prepare 换 guest
 * cookie），统一在 `runtime/execute.ts` 的 send 前按当时的 `ctx.cookie` 注入。
 * @param boundCookie - 绑定在 client 上的 cookie
 * @param base - 实例级请求配置
 * @param override - 单次调用的请求配置
 * @returns 本次调用的有效 cookie 与合并后的请求配置
 */
const resolveBoundRequest = (
  boundCookie: string,
  base?: RequestConfig,
  override?: RequestConfig
): { cookie: string; requestConfig: RequestConfig | undefined } => {
  const headers = new AmagiHeaders(base?.headers as HeadersInput).merge(override?.headers as HeadersInput)
  const cookieHeader = headers.get('cookie')
  return {
    cookie: cookieHeader ?? boundCookie,
    requestConfig: { ...(base ?? {}), ...(override ?? {}), headers: headers.toJSON() }
  }
}

/**
 * 端点短名 → v6 方法名的运行时查表（与类型层 {@link MethodNameOfEndpoint} 同一规则）。
 * @param platform - 平台
 * @param endpoint - 端点短名，如 `videoWork`
 * @returns v6 方法名；表里没有则退化为「`fetch` + 首字母大写」
 */
export const methodNameFor = (platform: Platform, endpoint: string): string =>
  methodNameOf(platform, endpoint) ?? `fetch${endpoint[0].toUpperCase()}${endpoint.slice(1)}`

/**
 * 执行一个端点声明（fetcher 与 server 路由共用的唯一执行入口）。
 *
 * 做四件事：
 * 1. 合并绑定 cookie 与单次调用的请求配置（`Cookie` header 大小写无关地覆盖绑定值）。
 * 2. 取本次调用的执行资源（`ctx.scope`）：独立 trace + 绑好本次 `meta` 的
 *    transport 事件出口。**这是 `http:*` / `network:*` / `log:*` 唯一的接线点**
 *    —— 事件负载要带 `requestId` / `endpoint`，而这两样只有「一次调用」才有。
 * 3. 组装 `EndpointCtx`，`send` 由调用方（transport）注入。
 * 4. 交给 `runtime/execute` 走完整管线，永不 reject。
 *
 * 拆出来是因为 fetcher 方法、server 路由、以及未来的会话引擎都要执行端点，
 * 执行路径必须只有一条，否则「同一端点两种行为」会悄悄溜进来。
 * @param def - 端点声明
 * @param ctx - 客户端上下文（含绑定 cookie 与 transport 的 send）
 * @param options - 未校验的入参
 * @param requestConfig - 单次调用的请求配置覆盖
 * @returns 成功或失败的信封
 */
export const callEndpoint = (
  def: AnyEndpointDef,
  ctx: ClientCtx,
  options?: unknown,
  requestConfig?: RequestConfig
) => {
  const merged = resolveBoundRequest(ctx.cookie, ctx.requestConfig, requestConfig)
  // 单次调用带 user-agent 时，签名器（读 ctx.userAgent，如 a_bogus）要用
  // 覆盖后的 UA 签名 —— v6 的「自定义 UA 覆盖默认值且用于签名」语义
  const mergedUA = merged.requestConfig
    ? (new AmagiHeaders(merged.requestConfig.headers as HeadersInput).get('user-agent') ?? ctx.userAgent)
    : ctx.userAgent

  // 本次调用的 requestId 在这里就定下来：execute 的 api:* 与 transport 的
  // http:* / network:* 必须落在同一个 id 上，否则事件之间无法关联
  const now = ctx.now ?? Date.now
  const startedAt = now()
  const requestId = (ctx.requestId ?? defaultRequestId)()
  let tracer = ctx.trace
  const metaOf = (): AmagiMeta => ({
    requestId,
    clientId: ctx.clientId || STATIC_CLIENT_ID,
    platform: ctx.platform as Platform,
    endpoint: def.name,
    durationMs: now() - startedAt,
    attempts: tracer?.attempts ?? 0
  })
  const scope = ctx.scope?.(metaOf)
  if (scope) tracer = scope.trace

  return execute(def, options ?? {}, {
    ctx: {
      ...ctx,
      cookie: merged.cookie,
      userAgent: mergedUA,
      requestConfig: merged.requestConfig ?? {},
      ...(scope === undefined ? {} : { send: scope.send })
    },
    signers: ctx.signers,
    judge: ctx.judge,
    bus: ctx.bus,
    trace: tracer,
    debug: ctx.debug,
    now: ctx.now,
    requestId: () => requestId,
    sleep: ctx.sleep
  })
}

/**
 * 从 registry 派生一个绑定 cookie 的 fetcher（Proxy 实现）。
 *
 * - **方法集合自动跟随 registry**：方法名由端点短名推导（`METHOD_NAMES` 优先、
 *   规则名兜底），声明存在即方法存在；`Object.keys` / `in` / 属性访问都反映
 *   当前 registry。
 * - **单次调用可用任意大小写 `Cookie` header 覆盖绑定 cookie**（修 #23 / #32）。
 * - 方法第一次被访问时按需创建并缓存闭包，之后走同一份。
 *
 * `createBoundFetcher` 与它是同一个函数 —— 迁移文档里叫 `createFetcherFromRegistry`，
 * 本项目的 Proxy 版名字叫 `createBoundFetcher`，两个名字指同一实现。
 * @param platform - 平台
 * @param registry - 该平台的端点注册表
 * @param ctx - 客户端上下文（含绑定 cookie 与 transport 的 send）
 * @returns 绑定形态的 fetcher
 */
export const createFetcherFromRegistry = <P extends Platform, R extends Registry>(
  platform: P,
  registry: R,
  ctx: ClientCtx
): FetcherOf<P, R> => {
  const call = (def: AnyEndpointDef, options?: unknown, requestConfig?: RequestConfig) =>
    callEndpoint(def, { ...ctx, platform }, options, requestConfig)

  const proxy = new Proxy({} as Record<string, unknown>, {
    get: (target, prop) => {
      if (typeof prop !== 'string' || prop === 'then') return undefined
      if (target[prop] !== undefined) return target[prop]
      for (const [endpoint, def] of Object.entries(registry)) {
        if (methodNameFor(platform, endpoint) === prop) {
          const fn = (options?: unknown, requestConfig?: RequestConfig) => call(def, options, requestConfig)
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
      for (const [endpoint, _def] of Object.entries(registry)) {
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

  return proxy as unknown as FetcherOf<P, R>
}

/**
 * `createFetcherFromRegistry` 的别名。
 *
 * v6 的 `createBoundXxxFetcher(cookie, requestConfig)`（每平台一份、方法逐个手写）
 * 被这个 Proxy 版取代：方法集合由 registry 推导，cookie 与单次覆盖由 ctx 处理。
 */
export const createBoundFetcher = createFetcherFromRegistry
