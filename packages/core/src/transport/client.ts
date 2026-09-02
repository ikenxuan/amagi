import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'

import type { AmagiErrorCode, ErrorKind } from '../contracts/error'
import type { RequestTrace, TraceReason } from '../contracts/meta'
import { AmagiHeaders, type HeadersInput, type RawResponse, type RequestConfig, type RequestSpec } from '../contracts/request'
import { decideRetry, DEFAULT_MAX_RETRIES, type RetryPolicy } from './retry'
import { TraceCollector } from './trace'

/**
 * HTTP 客户端。
 *
 * **全仓唯一能发 HTTP 请求的地方。** 三处与 v6 `model/networks.ts` 的关键差异：
 *
 * 1. **不再用 `validateStatus: () => true`。** v6 那样写等于告诉 axios
 *    「任何状态码都算成功」，于是 400/401/403/404/412/429/500/503 全被当成正常
 *    响应往下流，既让 judge 拿不到 HTTP 层的失败信号，也让 429 / 5xx 永远不进
 *    重试。v7 用 axios 默认的 2xx 判定，非 2xx 走失败分支参与退避决策，
 *    但**状态码原样带在 `RawResponse.status` 上**交给 judge —— 平台经常在非 2xx
 *    响应体里放有用的业务码（B站 `-412`、小红书风控页）。
 * 2. **请求描述深拷贝。** v6 的 `const cleanedConfig = { ...config }` 只是浅拷贝，
 *    随后 `cleanedConfig.headers['User-Agent'] = ...` 就地改写了调用方持有的
 *    headers 对象（A14）。v7 每次发送都从输入重建一份 `AmagiHeaders`，
 *    调用方的对象不可能被碰到。
 * 3. **真的发事件。** v6 声明了 `http:request` / `http:response` 却从未发射
 *    （KNOWN-DEFECT #5）。v7 这五个事件名（另加 `http:error` / `network:retry` /
 *    `network:error`）都在本模块真的发出，事件出口由 runtime 注入，保持
 *    `contracts ← transport ← runtime` 的单向依赖。
 */

/**
 * transport 会发出的事件名。
 *
 * `http:error` / `network:retry` / `network:error` 是阶段 9.1 补的
 * —— v6 声明了这三个名字（`network:*` 由 `transport/legacy.ts` 真的发），
 * v7 的新管线之前一个都不发，于是同一个监听器从全局单例搬到实例总线上会
 * 静默失效。名字与 v6 对齐、**负载是 v7 形状**（带 `trace`，`meta` 由 runtime 补）。
 */
export type TransportEvent = 'http:request' | 'http:response' | 'http:error' | 'network:retry' | 'network:error'

/** 一次退避决策的事实（`network:retry` 的负载） */
export interface TransportRetryFacts {
  /** 归因错误码，与 `RequestTrace.retryOf` 同值 */
  code: AmagiErrorCode
  /** 传输层 errno（`ECONNRESET` 这类）；拿到了响应就没有 */
  errno?: string
  /** 平台返回的状态码；请求根本没发出就没有 */
  status?: number
  /** 这是第几次重试（`1` = 第一次重试），与 v6 `NetworkRetryEventData.attempt` 同义 */
  attempt: number
  /** 允许的最大重试次数 */
  maxRetries: number
  /** 这次退避要等的毫秒数 */
  delayMs: number
}

/** 彻底放弃的事实（`network:error` 的负载）：请求始终没拿到响应 */
export interface TransportFailureFacts {
  /** 归因错误码 */
  code: TransportFailure['code']
  /** 传输层 errno */
  errno?: string
  /** 失败文案，与 `TransportError.message` 同一句 */
  message: string
  /** 这次 `send` 一共发了几次请求 */
  attempts: number
}

/** 事件名 → transport 侧负载。`meta` 一律由 runtime 在出口处补上 */
export interface TransportEventPayloadMap {
  'http:request': { trace: RequestTrace }
  'http:response': { trace: RequestTrace }
  'http:error': { trace: RequestTrace; status: number }
  'network:retry': { trace: RequestTrace; retry: TransportRetryFacts }
  'network:error': { trace: RequestTrace; failure: TransportFailureFacts }
}

/**
 * transport 侧负载的合并视图。
 *
 * 给**出口实现方**（`runtime/events.ts` 的 `createTransportEmitter`）用：
 * 它按事件名读对应字段，不必自己写联合窄化。发射方（本模块）用
 * {@link TransportEventPayloadMap}，少一个字段就是编译错误。
 */
export interface TransportEventPayload {
  /** 这一条请求的明细 */
  trace: RequestTrace
  /** `http:error` 才有 */
  status?: number
  /** `network:retry` 才有 */
  retry?: TransportRetryFacts
  /** `network:error` 才有 */
  failure?: TransportFailureFacts
}

/**
 * 事件出口。
 *
 * transport 只知道「这一条请求的事实」，`AmagiMeta` 由 runtime 在闭包里补上再
 * 投递到总线，所以这里的负载里没有 `meta`。未注入时 transport 不发事件。
 */
export type TransportEmitter = <K extends TransportEvent>(event: K, payload: TransportEventPayloadMap[K]) => void

/** 传输层失败详情：请求根本没拿到响应 */
export interface TransportFailure {
  /** 错误大类 */
  kind: Extract<ErrorKind, 'network' | 'timeout'>
  /** amagi 错误码 */
  code: Extract<AmagiErrorCode, 'NETWORK_ERROR' | 'TIMEOUT'>
  /** 传输层 errno，如 `ECONNRESET` */
  errno?: string
  /** 这次 `send` 一共发了几次请求 */
  attempts: number
  /** 请求的 URL */
  url: string
}

/**
 * 传输层失败（请求根本没拿到响应）。
 *
 * 由 runtime 识别并映射为 `network` / `timeout` 信封，而不是落进
 * `execute` 那唯一一处 catch 变成 `internal`。
 */
export class TransportError extends Error implements TransportFailure {
  readonly kind: TransportFailure['kind']
  readonly code: TransportFailure['code']
  readonly errno?: string
  readonly attempts: number
  readonly url: string

  /**
   * @param options - 失败详情，`cause` 保留原始 Error
   */
  constructor(options: TransportFailure & { message: string; cause?: unknown }) {
    super(options.message, { cause: options.cause })
    this.name = 'TransportError'
    this.kind = options.kind
    this.code = options.code
    this.errno = options.errno
    this.attempts = options.attempts
    this.url = options.url
  }
}

/** `HttpClient` 的构造选项 */
export interface HttpClientOptions {
  /** 调用方传入的请求配置，原样透传给 axios */
  requestConfig?: RequestConfig
  /** 默认 header 基线，由平台 `config.ts` 提供；`spec.headers` 覆盖它 */
  headers?: HeadersInput
  /** 退避策略 */
  retry?: RetryPolicy
  /** trace 收集器。不传则自建一个（只计数、不带明细） */
  trace?: TraceCollector
  /** 事件出口，由 runtime 注入 */
  emit?: TransportEmitter
  /** 睡眠函数，测试可注入。默认基于 `setTimeout` */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 剥掉 User-Agent 里的 Edge 标识。
 *
 * 正则与 v6 `model/networks.ts` 的 `cleanUserAgent` 逐字一致 —— 改它会改变
 * 实际发出的指纹。v7 只改**在哪儿用**：v6 写的是
 * `if (headers['User-Agent'])`，只认这一种大小写，于是小红书那份全小写的默认
 * 配置（`user-agent`）从来没被清理过，快手那份大写的却被清理了 —— 同一个
 * 「剥 Edg」策略在四个平台上行为不一致，这就是 #17。
 * @param userAgent - 原始 UA
 * @returns 剥掉 Edge 标识后的 UA
 */
export const cleanUserAgent = (userAgent: string): string => userAgent.replace(/\s+Edg\/[\d.]+/g, '')

/**
 * 在出口处统一清理 UA，与 header 名的大小写无关。
 *
 * 借 `AmagiHeaders` 的大小写不敏感查找定位 UA，再用**原本的大小写**写回，
 * 所以平台各自的 header 风格（`User-Agent` / `user-agent`）都保留，
 * 但清理这件事只发生一次、只有一种行为。
 * @param headers - 已合并好的请求头
 */
const stripEdgeToken = (headers: AmagiHeaders): void => {
  const current = headers.get('user-agent')
  if (current === undefined) return
  const cleaned = cleanUserAgent(current)
  if (cleaned === current) return
  const name = headers.keys().find((key) => key.toLowerCase() === 'user-agent') ?? 'user-agent'
  headers.set(name, cleaned)
}

/**
 * 把 axios 的响应头归一化成大小写不敏感容器
 * @param headers - axios 响应头
 * @returns 归一化后的容器
 */
const toAmagiHeaders = (headers: unknown): AmagiHeaders => {
  if (!headers) return new AmagiHeaders()
  const source = headers as { toJSON?: () => Record<string, unknown> }
  const plain = typeof source.toJSON === 'function' ? source.toJSON() : (headers as Record<string, unknown>)
  const out = new AmagiHeaders()
  for (const [name, value] of Object.entries(plain)) {
    out.set(name, Array.isArray(value) ? value.join('; ') : (value as string | number | undefined | null))
  }
  return out
}

/**
 * 取出原始 Set-Cookie 头数组（可能有多条，join 会丢失逐条信息）。
 * @param headers - axios 响应头
 * @returns Set-Cookie 数组；没有则 `undefined`
 */
const extractSetCookie = (headers: unknown): string[] | undefined => {
  if (!headers) return undefined
  const source = headers as { toJSON?: () => Record<string, unknown> }
  const plain = typeof source.toJSON === 'function' ? source.toJSON() : (headers as Record<string, unknown>)
  const raw = plain['set-cookie'] ?? plain['Set-Cookie']
  if (raw === undefined) return undefined
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
  if (typeof raw === 'string' && raw.length > 0) return [raw]
  return undefined
}

/** HTTP 客户端 */
export class HttpClient {
  private readonly options: HttpClientOptions
  private readonly tracer: TraceCollector
  private readonly sleep: (ms: number) => Promise<void>

  /**
   * @param options - 构造选项
   */
  constructor(options: HttpClientOptions = {}) {
    this.options = options
    this.tracer = options.trace ?? new TraceCollector()
    this.sleep = options.sleep ?? defaultSleep
  }

  /** 本次调用累计发出的请求数（含重试、分页、分段与 prepare） */
  get attempts(): number {
    return this.tracer.attempts
  }

  /** trace 收集器，供 runtime 取快照 */
  get collector(): TraceCollector {
    return this.tracer
  }

  /**
   * 发一次请求，内部按策略退避重试。
   *
   * @param spec - 请求描述。**不会被改写**，调用方持有的对象保持原样
   * @param reason - 这次请求的来源，决定它在 trace 里的 `reason`
   * @param requestConfig - 单次调用的请求配置（per-call），覆盖构造时传入的
   *   `options.requestConfig`。fetcher 的单次 `requestConfig` 形参就是从这里
   *   进入请求的：绑定 cookie 的 fetcher 每次调用合并「实例配置 → 单次配置」，
   *   执行时把合并结果带到这里
   * @returns 原始响应。非 2xx 也返回，状态码原样带在 `status` 上
   * @throws {TransportError} 请求根本没拿到响应，且重试已用尽
   */
  async send(spec: RequestSpec, reason: TraceReason = 'initial', requestConfig?: RequestConfig): Promise<RawResponse> {
    let attempt = 0
    let retryOf: AmagiErrorCode | undefined

    for (;;) {
      attempt += 1
      const config = this.buildAxiosConfig(spec, requestConfig)
      const end = this.tracer.begin({
        url: config.url ?? spec.url,
        method: spec.method,
        reason: attempt === 1 ? reason : 'retry',
        retryOf
      })
      const started = this.tracer.entries[this.tracer.attempts - 1]
      this.publishRequest(started)

      try {
        const res = await axios(config)
        return this.finish(end({ status: res.status }), res, spec)
      } catch (cause) {
        if (!(cause instanceof AxiosError)) {
          this.publishResponse(end())
          throw cause
        }

        const decision = decideRetry({
          attempt,
          errno: cause.response ? undefined : cause.code,
          status: cause.response?.status,
          policy: this.options.retry
        })

        if (!decision.retry) {
          if (cause.response) return this.finish(end({ status: cause.response.status }), cause.response, spec)
          const trace = end()
          this.publishResponse(trace)
          const failure = this.toTransportError(cause, attempt, spec.url)
          // 请求始终没拿到响应、且退避已用尽 —— v6 在同一处发 network:error + log:error
          this.publishNetworkError(trace, {
            code: failure.code,
            ...(failure.errno === undefined ? {} : { errno: failure.errno }),
            message: failure.message,
            attempts: attempt
          })
          throw failure
        }

        const retried = end(cause.response ? { status: cause.response.status } : undefined)
        this.publishResponse(retried)
        this.publishRetry(retried, {
          code: decision.reason,
          ...(cause.response === undefined && cause.code !== undefined ? { errno: cause.code } : {}),
          ...(cause.response === undefined ? {} : { status: cause.response.status }),
          attempt,
          maxRetries: this.options.retry?.maxRetries ?? DEFAULT_MAX_RETRIES,
          delayMs: decision.delayMs
        })
        retryOf = decision.reason
        await this.sleep(decision.delayMs)
      }
    }
  }

  /**
   * 收尾一次拿到了响应的请求（2xx 与非 2xx 都走这里）
   * @param trace - 已收尾的 trace 记录
   * @param res - axios 响应
   * @param spec - 原始请求描述
   * @returns 原始响应
   */
  private finish(trace: RequestTrace, res: AxiosResponse, spec: RequestSpec): RawResponse {
    this.publishResponse(trace)
    return {
      status: res.status,
      statusText: res.statusText,
      headers: toAmagiHeaders(res.headers),
      setCookie: extractSetCookie(res.headers),
      body: res.data,
      durationMs: trace.durationMs,
      url: res.config?.url ?? spec.url
    }
  }

  /**
   * 把 axios 的传输层失败转成 `TransportError`
   * @param cause - 原始 AxiosError
   * @param attempts - 已尝试次数
   * @param url - 请求 URL
   * @returns TransportError
   */
  private toTransportError(cause: AxiosError, attempts: number, url: string): TransportError {
    const timedOut = cause.code === 'ETIMEDOUT' || cause.code === 'ECONNABORTED'
    return new TransportError({
      message: `网络请求失败 [${cause.code ?? 'UNKNOWN'}]: ${cause.message}（已尝试 ${attempts} 次）`,
      kind: timedOut ? 'timeout' : 'network',
      code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
      errno: cause.code,
      attempts,
      url,
      cause
    })
  }

  /**
   * 把请求描述编译成 axios 配置。
   *
   * 每次调用都从输入重建一份 headers，因此调用方传入的对象**不会**被改写（A14）。
   * 合并顺序：平台基线 → 实例 `requestConfig.headers` → 单次 `requestConfig.headers`
   * → `spec.headers`，后者覆盖前者。
   *
   * 刻意**不设** `validateStatus`：交给 axios 默认的 2xx 判定，非 2xx 才能进入
   * 失败分支参与退避决策。v6 传 `() => true` 等于永远不重试 429 / 5xx。
   * @param spec - 请求描述
   * @param perCall - 单次调用的请求配置（可选），非 headers 字段覆盖实例级
   * @returns axios 配置
   */
  private buildAxiosConfig(spec: RequestSpec, perCall?: RequestConfig): AxiosRequestConfig {
    const headers = new AmagiHeaders(this.options.headers)
      .merge(this.options.requestConfig?.headers as HeadersInput)
      .merge(perCall?.headers as HeadersInput)
      .merge(spec.headers)

    const { headers: _baseHeaders, ...baseRest } = this.options.requestConfig ?? {}
    const { headers: _callHeaders, ...callRest } = perCall ?? {}
    stripEdgeToken(headers)
    return {
      ...baseRest,
      ...callRest,
      url: spec.url,
      method: spec.method,
      headers: headers.toJSON(),
      ...(spec.body === undefined ? {} : { data: spec.body }),
      ...(spec.responseType === undefined ? {} : { responseType: spec.responseType })
    }
  }

  /**
   * 投递「一次请求即将发出」（未注入出口时什么都不做）
   * @param trace - 这一条请求的 trace
   */
  private publishRequest(trace: RequestTrace): void {
    this.options.emit?.('http:request', { trace: { ...trace } })
  }

  /**
   * 投递「一次请求已经结束」。
   *
   * 拿到了响应但状态码不是 2xx 时**再**发一条 `http:error`
   * —— `http:response` 是「结束了」，`http:error` 是「结束得不对」，
   * 两者都发才能让只关心失败的监听器不必自己判状态码。
   * @param trace - 这一条请求的 trace（已收尾）
   */
  private publishResponse(trace: RequestTrace): void {
    this.options.emit?.('http:response', { trace: { ...trace } })
    const status = trace.status
    if (status === undefined || (status >= 200 && status < 300)) return
    this.options.emit?.('http:error', { trace: { ...trace }, status })
  }

  /**
   * 投递「这次失败要退避重试」
   * @param trace - 刚刚失败的那条请求的 trace
   * @param retry - 退避决策的事实
   */
  private publishRetry(trace: RequestTrace, retry: TransportRetryFacts): void {
    this.options.emit?.('network:retry', { trace: { ...trace }, retry })
  }

  /**
   * 投递「彻底没拿到响应」
   * @param trace - 最后一条请求的 trace
   * @param failure - 放弃时的事实
   */
  private publishNetworkError(trace: RequestTrace, failure: TransportFailureFacts): void {
    this.options.emit?.('network:error', { trace: { ...trace }, failure })
  }
}
