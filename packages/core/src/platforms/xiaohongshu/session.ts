import { SessionManager } from '@ikenxuan/xhshow-ts'

import { getCookieValue, parseCookie, type XiaohongshuSessionInput } from '../../contracts/cookie'
import type { EndpointCtx } from '../../contracts/endpoint'
import { AmagiHeaders, type RequestSpec } from '../../contracts/request'

/** 比较完整 Cookie，避免只按 a1 复用不同 web_session 的密钥。 */
export const sameXiaohongshuCookie = (left: string, right: string): boolean => {
  const a = parseCookie(left)
  const b = parseCookie(right)
  return Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([name, value]) => b[name] === value)
}

/** 校验并复制调用方输入；异常不包含 Cookie、b1 或密钥原文。 */
export const createXiaohongshuSession = (input: XiaohongshuSessionInput): XiaohongshuSessionInput => {
  if (typeof input?.cookie !== 'string' || !getCookieValue(input.cookie, 'a1')) {
    throw new TypeError('小红书显式会话需要含 a1 的完整 Cookie')
  }
  if (input.b1 !== undefined && (typeof input.b1 !== 'string' || input.b1.trim().length === 0)) {
    throw new TypeError('小红书会话 b1 必须是非空白字符串')
  }
  if (input.userId !== undefined && (typeof input.userId !== 'string' || input.userId.trim().length === 0)) {
    throw new TypeError('小红书会话 userId 必须是非空白字符串')
  }
  let webSsk: Readonly<Record<string, string>> | undefined
  if (input.webSsk !== undefined) {
    try {
      const parsed: unknown = typeof input.webSsk === 'string' ? JSON.parse(input.webSsk) : input.webSsk
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
      const entries = Object.entries(parsed)
      for (const [appId, key] of entries) {
        if (!appId || appId === '__proto__' || typeof key !== 'string' || key.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(key)) {
          throw new Error()
        }
        if (Buffer.from(key, 'base64').length < 32) throw new Error()
      }
      webSsk = Object.freeze(Object.fromEntries(entries))
    } catch {
      throw new TypeError('小红书会话 webSsk 格式无效')
    }
  }
  return Object.freeze({
    cookie: input.cookie,
    ...(webSsk === undefined ? {} : { webSsk }),
    ...(input.b1 === undefined ? {} : { b1: input.b1 }),
    ...(input.userId === undefined ? {} : { userId: input.userId })
  })
}

interface SigningSession {
  manager: SessionManager
  b1?: string
  userId?: string
}

// 键是已复制的会话对象，不是账号名或 a1；客户端销毁后可回收。
const signingSessions = new WeakMap<XiaohongshuSessionInput, SigningSession>()

/** 仅在本次传输仍使用绑定 Cookie 时读取会话材料。 */
export const xiaohongshuSigningSession = (ctx: EndpointCtx, spec: RequestSpec): SigningSession | undefined => {
  const input = ctx.xiaohongshuSession
  if (ctx.platform !== 'xiaohongshu' || !input || spec.dropHeaders?.some((name) => name.toLowerCase() === 'cookie')) return undefined
  const headerCookie = new AmagiHeaders(spec.headers).get('cookie')
  if (
    !sameXiaohongshuCookie(input.cookie, ctx.cookie) ||
    (headerCookie !== undefined && !sameXiaohongshuCookie(input.cookie, headerCookie))
  ) {
    return undefined
  }
  let session = signingSessions.get(input)
  if (!session) {
    session = {
      manager: new SessionManager(undefined, { webSsk: input.webSsk }),
      ...(input.b1 === undefined ? {} : { b1: input.b1 }),
      ...(input.userId === undefined ? {} : { userId: input.userId })
    }
    signingSessions.set(input, session)
  }
  return session
}
