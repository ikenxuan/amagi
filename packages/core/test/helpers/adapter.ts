/**
 * 测试用 axios adapter 工具。
 *
 * core 的 `RequestConfig` 会原样透传给 axios（`fetchData` 只补 url / headers /
 * validateStatus），因此注入自定义 `adapter` 就能在**不 mock 模块、不发真实请求**
 * 的前提下驱动完整调用链：fetcher -> internal -> getdata -> networks -> axios。
 */
import { AxiosError, type AxiosAdapter, type AxiosRequestConfig, type AxiosResponse } from 'axios'

/** 一次被捕获的请求 */
export interface CapturedRequest {
  url: string
  method?: string
  headers: Record<string, unknown>
  data?: unknown
  /** 解析后的 query 参数，便于断言 */
  query: Record<string, string>
}

export interface AdapterHandle {
  adapter: AxiosAdapter
  /** 按调用顺序记录的所有请求 */
  requests: CapturedRequest[]
  /** 调用次数 */
  readonly count: number
  /** 最后一次请求 */
  last: () => CapturedRequest
  /** 第 n 次请求（0 起） */
  at: (n: number) => CapturedRequest
}

const toPlainHeaders = (headers: unknown): Record<string, unknown> => {
  if (!headers) return {}
  const h = headers as { toJSON?: () => Record<string, unknown> }
  if (typeof h.toJSON === 'function') return h.toJSON()
  return { ...(headers as Record<string, unknown>) }
}

const parseQuery = (url: string): Record<string, string> => {
  const qIndex = url.indexOf('?')
  if (qIndex === -1) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(url.slice(qIndex + 1))) out[k] = v
  return out
}

const capture = (config: AxiosRequestConfig): CapturedRequest => ({
  url: config.url ?? '',
  method: config.method,
  headers: toPlainHeaders(config.headers),
  data: config.data,
  query: parseQuery(config.url ?? '')
})

const buildResponse = <T>(config: AxiosRequestConfig, data: T, status = 200): AxiosResponse<T> => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : String(status),
  headers: {},
  config: config as AxiosResponse<T>['config']
})

/**
 * 按顺序返回预设响应的 adapter。响应用尽后重复最后一个。
 * @param responses - 依次返回的响应体；元素为函数时以捕获到的请求为入参动态生成
 */
export const sequenceAdapter = <T>(responses: Array<T | ((req: CapturedRequest, index: number) => T)>, status = 200): AdapterHandle => {
  const requests: CapturedRequest[] = []
  const handle: AdapterHandle = {
    adapter: async (config) => {
      const req = capture(config)
      const index = requests.length
      requests.push(req)
      const picked = responses[Math.min(index, responses.length - 1)]
      const body = typeof picked === 'function' ? (picked as (r: CapturedRequest, i: number) => T)(req, index) : picked
      return buildResponse(config, body, status)
    },
    requests,
    get count() {
      return requests.length
    },
    last: () => requests[requests.length - 1],
    at: (n) => requests[n]
  }
  return handle
}

/** 始终返回同一响应体的 adapter */
export const constantAdapter = <T>(body: T, status = 200): AdapterHandle => sequenceAdapter<T>([body], status)

/**
 * 抛出 AxiosError 的 adapter，用于测试 networks 的重试路径。
 * @param code - errno，如 `ECONNRESET`；决定是否走可恢复重试
 * @param failTimes - 前 N 次失败，之后返回 `successBody`
 */
export const failingAdapter = <T>(code: string, failTimes: number, successBody?: T): AdapterHandle => {
  const requests: CapturedRequest[] = []
  const handle: AdapterHandle = {
    adapter: async (config) => {
      const req = capture(config)
      requests.push(req)
      if (requests.length <= failTimes) {
        const err = new AxiosError(`mock ${code}`, code, config as never)
        err.code = code
        throw err
      }
      return buildResponse(config, successBody as T)
    },
    requests,
    get count() {
      return requests.length
    },
    last: () => requests[requests.length - 1],
    at: (n) => requests[n]
  }
  return handle
}

/** 抛出非 Axios 错误的 adapter（networks 应当原样上抛） */
export const throwingAdapter = (error: unknown): AdapterHandle => {
  const requests: CapturedRequest[] = []
  return {
    adapter: async (config) => {
      requests.push(capture(config))
      throw error
    },
    requests,
    get count() {
      return requests.length
    },
    last: () => requests[requests.length - 1],
    at: (n) => requests[n]
  }
}
