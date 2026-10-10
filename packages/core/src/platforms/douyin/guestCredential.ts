import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { parseCookie, serializeCookie } from '../../contracts/cookie'
import type { RawResponse } from '../../contracts/request'
import { credentialScope, credentialUserAgent, type DouyinCredentialRequestOptions, sendCredentialRequest } from './credentialRequest'
import { signDouyinGuestChallenge } from './guestChallenge'

const HOME_URL = 'https://www.douyin.com/'
const TTL_MS = 2 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 32
interface CacheEntry {
  cookie: string
  mintedAt: number
  userAgent: string
}
export interface MintDouyinGuestCookieOptions extends DouyinCredentialRequestOptions {
  force?: boolean
  /**
   * @deprecated 不再生效。签名改为纯算后没有脚本执行阶段可限时；字段只为已有调用方
   * 照旧通过类型检查而保留。
   */
  scriptTimeoutMs?: number
}

let cacheFile: string | null = null
let generation = 0
const cached = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<string | null>>()
const diskLoaded = new Set<string>()

/**
 * 可选的磁盘缓存。每个网络身份使用一个私有文件；传 null 则 token 只保存在内存中。
 * 自定义 transport 只使用各自作用域内的内存缓存，避免不同代理之间复用磁盘缓存。
 */
export const configureDouyinGuestCache = (filePath: string | null): void => {
  cacheFile = filePath ? path.resolve(filePath) : null
  generation++
  cached.clear()
  inflight.clear()
  diskLoaded.clear()
}

const guestCookie = (jar: Record<string, string>): string | null => {
  if (!jar.UIFID && !jar.UIFID_TEMP) return null
  return serializeCookie({ ttwid: jar.ttwid || undefined, UIFID: jar.UIFID || undefined, UIFID_TEMP: jar.UIFID_TEMP || undefined })
}

const validEntry = (entry: unknown, userAgent: string): entry is CacheEntry => {
  if (!entry || typeof entry !== 'object') return false
  const item = entry as Partial<CacheEntry>
  if (typeof item.cookie !== 'string' || /[\r\n]/.test(item.cookie) || item.userAgent !== userAgent || typeof item.mintedAt !== 'number')
    return false
  const age = Date.now() - item.mintedAt
  return Number.isFinite(age) && age >= 0 && age < TTL_MS && guestCookie(parseCookie(item.cookie)) === item.cookie
}

const saveToDisk = (file: string, entry: CacheEntry): void => {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(temporary, JSON.stringify(entry), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    fs.renameSync(temporary, file)
  } catch {
    // 磁盘缓存失败不能妨碍使用刚签发的内存凭据。
    try {
      fs.unlinkSync(temporary)
    } catch {
      /* 临时文件未被创建。 */
    }
  }
}

/** 握手一发只交出状态与 Set-Cookie，不交响应体 */
type HandshakeResponse = Pick<RawResponse, 'status' | 'setCookie'>

/**
 * 握手 GET 首页。响应体在这一层就丢掉：签名纯算，两发都只用得上 cookie，于是
 * 「解析挑战页」在 {@link doMint} 里是类型上做不到的事，而不是一条靠人遵守的约定。
 */
const getHome = async (options: MintDouyinGuestCookieOptions, cookie: string): Promise<HandshakeResponse> => {
  const { status, setCookie } = await sendCredentialRequest(
    options,
    {
      method: 'GET',
      url: HOME_URL,
      headers: { accept: 'text/html', cookie }
    },
    15000
  )
  return { status, setCookie }
}

const mergeResponseCookies = (jar: Record<string, string>, response: HandshakeResponse): void => {
  for (const header of response.setCookie ?? []) {
    Object.assign(jar, parseCookie(header.split(';', 1)[0]))
  }
}

const doMint = async (options: MintDouyinGuestCookieOptions): Promise<string | null> => {
  try {
    const jar: Record<string, string> = Object.create(null)
    const first = await getHome(options, '')
    if (first.status < 200 || first.status >= 400) return null
    mergeResponseCookies(jar, first)
    const issued = guestCookie(jar)
    if (issued) return issued
    if (!jar.__ac_nonce) return null
    const signature = signDouyinGuestChallenge(jar.__ac_nonce, credentialUserAgent(options))
    if (!signature) return null
    jar.__ac_signature = signature
    const second = await getHome(options, serializeCookie(jar))
    if (second.status < 200 || second.status >= 400) return null
    mergeResponseCookies(jar, second)
    return guestCookie(jar)
  } catch {
    return null
  }
}

/**
 * 显式获取服务端签发的游客凭据，缓存未命中时请求抖音首页。
 *
 * 首发拿 `__ac_nonce`，`__ac_signature` 纯算（见 `./guestChallenge.ts`），再发一次换
 * 凭据。挑战页不解析、不执行。普通数据端点不会自动触发这条握手，必须由宿主主动调用。
 * 默认缓存仅在内存中；configureDouyinGuestCache 可启用磁盘存储。同一 transport
 * 作用域内的并发请求共享同一次获取。
 * 失败时返回 null。
 */
export const mintDouyinGuestCookie = async (options: MintDouyinGuestCookieOptions = {}): Promise<string | null> => {
  const userAgent = credentialUserAgent(options)
  const scope = credentialScope(options)
  const key = `${scope}\0${userAgent}`
  const epoch = generation
  const file = scope === 'default' ? cacheFile : null
  if (!options.force && file && !diskLoaded.has(key)) {
    diskLoaded.add(key)
    try {
      const entry: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (validEntry(entry, userAgent)) cached.set(key, entry)
    } catch {
      /* 缓存缺失或无效都按未命中处理。 */
    }
  }
  const hit = cached.get(key)
  if (!options.force && validEntry(hit, userAgent)) return hit.cookie
  const pending = inflight.get(key)
  if (pending) return pending
  const task = doMint(options).then((cookie) => {
    if (cookie && epoch === generation) {
      const entry = { cookie, userAgent, mintedAt: Date.now() }
      cached.delete(key)
      cached.set(key, entry)
      if (cached.size > MAX_CACHE_ENTRIES) cached.delete(cached.keys().next().value!)
      if (file) saveToDisk(file, entry)
    }
    return cookie
  })
  inflight.set(key, task)
  try {
    return await task
  } finally {
    if (inflight.get(key) === task) inflight.delete(key)
  }
}
