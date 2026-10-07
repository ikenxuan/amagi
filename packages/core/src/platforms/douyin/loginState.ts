import { createHash } from 'node:crypto'

import { normalizeDouyinCookie } from './cookie'
import { credentialScope, credentialUserAgent, type DouyinCredentialRequestOptions, sendCredentialRequest } from './credentialRequest'

export type DouyinLoginState = 'login' | 'guest' | 'expired' | 'unusable' | 'unknown'
export interface DouyinLoginCheck {
  state: DouyinLoginState
  errorCode?: number
  description?: string
  cached: boolean
}

export interface CheckDouyinLoginStateOptions extends DouyinCredentialRequestOptions {
  force?: boolean
}
type CheckResult = Omit<DouyinLoginCheck, 'cached'>
const TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 256
const cache = new Map<string, { at: number; result: CheckResult }>()
const inflight = new Map<string, Promise<DouyinLoginCheck>>()
let generation = 0

const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined

/** 只有 passport 账号接口的明确信号才被解读为登录态。 */
const classify = (value: unknown): CheckResult => {
  let body = value
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return { state: 'unknown' }
    }
  }
  const root = object(body)
  const data = object(root?.data)
  if (!root || !data) return { state: 'unknown' }
  if (root.message === 'success') {
    if (data.is_visitor_account === true) return { state: 'guest' }
    if (data.is_visitor_account === false && (data.user_id_str || data.user_id)) return { state: 'login' }
    return { state: 'unknown' }
  }
  const code = Number(data.error_code)
  if (root.message === 'error' && code === 13) {
    return { state: 'expired', errorCode: code, ...(typeof data.description === 'string' ? { description: data.description } : {}) }
  }
  return { state: 'unknown' }
}

/** `unknown` 表示探测失败，而非登录失效；因此刻意不缓存。 */
export const checkDouyinLoginState = async (
  cookie?: string | null,
  options: CheckDouyinLoginStateOptions = {}
): Promise<DouyinLoginCheck> => {
  const normalized = normalizeDouyinCookie(cookie).cookie
  if (!normalized) return { state: 'unusable', cached: false }
  const key = createHash('sha256')
    .update(`${credentialScope(options)}\0${credentialUserAgent(options)}\0${normalized}`)
    .digest('hex')
  const now = Date.now()
  const hit = cache.get(key)
  if (!options.force && hit && now >= hit.at && now - hit.at < TTL_MS) return { ...hit.result, cached: true }
  const running = inflight.get(key)
  if (running) return running
  const epoch = generation
  const task = (async (): Promise<DouyinLoginCheck> => {
    let result: CheckResult = { state: 'unknown' }
    try {
      const response = await sendCredentialRequest(
        options,
        {
          method: 'GET',
          url: 'https://www.douyin.com/passport/account/info/v2/',
          headers: { cookie: normalized, referer: 'https://www.douyin.com/', accept: 'application/json, text/plain, */*' }
        },
        8000
      )
      if (response.status >= 200 && response.status < 300) result = classify(response.body)
    } catch {
      /* 网络失败不能让本来有效的登录态被丢弃。 */
    }
    if (epoch === generation && result.state !== 'unknown') {
      cache.delete(key)
      cache.set(key, { at: Date.now(), result })
      if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!)
    }
    return { ...result, cached: false }
  })()
  inflight.set(key, task)
  try {
    return await task
  } finally {
    if (inflight.get(key) === task) inflight.delete(key)
  }
}

export const isDouyinCookieUsable = async (cookie?: string | null, options: CheckDouyinLoginStateOptions = {}): Promise<boolean> => {
  const { state } = await checkDouyinLoginState(cookie, options)
  return state === 'login' || state === 'unknown'
}

/** 清空时也会让进行中的探测失效，避免旧结果回填缓存。 */
export const clearDouyinLoginStateCache = (): void => {
  generation++
  cache.clear()
  inflight.clear()
}
