/**
 * 与 server 那半边说话。**只走 HTTP。**
 *
 * 类型从 `shared/contract.ts` 来 —— 那个文件**一个 import 都没有**，两边各自引它。
 * 试过让前端直接 `import type` server 的类型（声明处只有一处，看着更好），不行：
 * `import type` 运行时确实被擦掉，但 **tsc 仍要编译整条 import 图**，
 * 于是浏览器侧的 tsconfig（没有 `types: ["node"]`，那正是它存在的理由）会去编译
 * core 的签名算法，报几十条「Cannot find name 'Buffer'」。契约必须独立成一层。
 */

import type { BatchResult, GenerateResult, JsonValue, PlatformInfo, RecordOutcome } from '../../shared/contract'

export type {
  BatchResult,
  DiffLine,
  EndpointInfo,
  FieldSchema,
  GenerateResult,
  JsonValue,
  ParamsSchema,
  PlatformInfo,
  RecordOutcome
} from '../../shared/contract'

/** 口令从页面自己的 URL 取（绑局域网时才需要，回环下没有） */
const token = new URLSearchParams(location.search).get('token')

const withToken = (path: string): string => {
  if (token === null) return path
  return `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
}

const request = async <T>(path: string, body?: unknown): Promise<T> => {
  const response = await fetch(
    withToken(path),
    body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
  )
  // 非 2xx 一律把响应正文当错误文案抛出去 —— server 那边失败时回的就是纯文本
  if (!response.ok) throw new Error(await response.text())
  return (await response.json()) as T
}

export const fetchEndpoints = (): Promise<PlatformInfo[]> => request('/api/endpoints')

export const recordOne = (input: { platform: string; endpoint: string; params: Record<string, JsonValue> }): Promise<RecordOutcome> =>
  request('/api/record', input)

export const recordBatch = (input: { platform: string; endpoint: string }): Promise<BatchResult> => request('/api/record-batch', input)

export const storeSample = (pendingId: string): Promise<{ written: string }> => request('/api/store', { pendingId })

export const discardSample = (pendingId: string): Promise<{ discarded: boolean; existed: boolean }> =>
  request('/api/discard', { pendingId })

export const generateTypes = (input: { platform: string; endpoint: string }): Promise<GenerateResult> => request('/api/generate', input)
