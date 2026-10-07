import { getCookieValue, type XiaohongshuSessionInput } from '../../contracts/cookie'
import type { EndpointCtx } from '../../contracts/endpoint'
import { EndpointError } from '../../contracts/error'
import { AmagiHeaders, type HeadersInput } from '../../contracts/request'
import { createXiaohongshuGuestSession } from './sign/guestCookie'

const GUEST_TTL_MS = 5 * 60 * 1000
const MAX_CACHED_CONFIGS = 32

interface GuestSession {
  promise: Promise<XiaohongshuSessionInput>
  pending: boolean
  expiresAt: number
}

const sessions = new WeakMap<object, Map<string, GuestSession>>()
const references = new WeakMap<object, number>()
let nextReference = 0

const referenceId = (value: object): number => {
  let id = references.get(value)
  if (id === undefined) {
    id = ++nextReference
    references.set(value, id)
  }
  return id
}

/** 普通配置按值比较；adapter、agent 和 abort signal 按引用隔离。 */
const configValue = (value: unknown, seen = new Set<object>()): unknown => {
  if (value === null) return ['null']
  const kind = typeof value
  if (kind !== 'object' && kind !== 'function') return [kind, String(value)]
  const object = value as object
  if (kind === 'function' || seen.has(object)) return ['ref', referenceId(object)]
  const plain = Object.getPrototypeOf(object) === Object.prototype || Object.getPrototypeOf(object) === null
  if (!Array.isArray(value) && !plain) return ['ref', referenceId(object)]
  seen.add(object)
  const result = Array.isArray(value)
    ? ['array', value.map((item) => configValue(item, seen))]
    : [
        'object',
        Object.entries(object)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, configValue(item, seen)])
      ]
  seen.delete(object)
  return result
}

const configKey = (ctx: EndpointCtx): string => {
  const headers = new AmagiHeaders(ctx.requestConfig.headers as HeadersInput).set('User-Agent', ctx.userAgent)
  const normalized = Object.fromEntries(headers.toEntries().map(([key, value]) => [key.toLowerCase(), value]))
  return JSON.stringify(configValue({ cookie: ctx.cookie, ...ctx.requestConfig, headers: normalized }))
}

/** 只淘汰已完成的条目，让并发调用方继续共享进行中的初始化。 */
const pruneSessions = (cache: Map<string, GuestSession>): void => {
  const now = Date.now()
  for (const [key, session] of cache) {
    if (!session.pending && (session.expiresAt <= now || cache.size > MAX_CACHED_CONFIGS)) cache.delete(key)
  }
}

const guestSession = (ctx: EndpointCtx): Promise<XiaohongshuSessionInput> => {
  const owner = ctx.transportIdentity ?? ctx.send
  let cache = sessions.get(owner)
  if (!cache) {
    cache = new Map()
    sessions.set(owner, cache)
  }
  pruneSessions(cache)
  const key = configKey(ctx)
  const current = cache.get(key)
  if (current) return current.promise

  const entry: GuestSession = {
    pending: true,
    expiresAt: 0,
    promise: createXiaohongshuGuestSession((spec) => ctx.send(spec, 'prepare'), {
      ...ctx.requestConfig,
      headers: new AmagiHeaders(ctx.requestConfig.headers as HeadersInput).set('User-Agent', ctx.userAgent).toJSON()
    }).then(
      (session) => {
        entry.pending = false
        entry.expiresAt = Date.now() + GUEST_TTL_MS
        pruneSessions(cache)
        return session
      },
      (error: unknown) => {
        cache.delete(key)
        throw error
      }
    )
  }
  cache.set(key, entry)
  return entry.promise
}

/**
 * 支持游客会话的端点的 prepare。
 *
 * 已含 a1 的 cookie 原样保留；明确带用户会话却缺 a1 的直接拒绝。
 * 其余请求经 scripting → webprofile → activate 初始化。
 * 每个 transport/UA/配置组合的会话复用五分钟，并发初始化合并为一次，
 * 失败的立即淘汰。
 */
export const guestFallbackPrepare = async (ctx: EndpointCtx): Promise<Partial<EndpointCtx>> => {
  if (getCookieValue(ctx.cookie, 'a1')) return {}
  if (getCookieValue(ctx.cookie, 'web_session') || getCookieValue(ctx.cookie, 'userId')) {
    throw new EndpointError({
      kind: 'auth',
      code: 'COOKIE_MISSING',
      message: '小红书 Cookie 已包含会话或用户身份，但缺少 a1；请提供同一会话的完整 Cookie。'
    })
  }
  const session = await guestSession(ctx)
  return { cookie: session.cookie, xiaohongshuSession: session }
}
