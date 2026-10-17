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
const inflight = new Map<string, Promise<DouyinGuestHandshake | null>>()
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

const guestCookie = (jar: Record<string, string>): string =>
  serializeCookie({ ttwid: jar.ttwid || undefined, UIFID: jar.UIFID || undefined, UIFID_TEMP: jar.UIFID_TEMP || undefined })

/**
 * 一次游客握手**到手的东西**，按服务端实际给了什么如实记录。
 *
 * 为什么不直接交一个 cookie 串：**「挑战过没过」与「发不发访客 id」是服务端两个
 * 独立决定**。2026-10-11 实测到一发第二发 200、约 1.0MB 的**真页**（无挑战锚点 ——
 * 签名过了）、`Set-Cookie` 发了 `ttwid` + `enter_pc_once` + `web_sign_token`、
 * **独独没有 `UIFID_TEMP`** 的响应。串成一个字符串就再也分不出「拿到游客凭据」与
 * 「只拿到设备标识」这两种结局，而 `./credential.ts` 必须分得出 —— 它把非 null 当作
 * 「拿到了游客凭据」并整串替换调用方 cookie，分不出就会把后一种说成前一种。
 */
export interface DouyinGuestHandshake {
  /** 到手的凭据串（`ttwid` + 访客 id），可直接当 cookie 用 */
  cookie: string
  /**
   * 服务端签发的访客 id（`UIFID` / `UIFID_TEMP` 任一拼写）。
   *
   * **这一项的有无是「拿到游客凭据」的唯一判据**，不是 `cookie` 非空。
   */
  visitorId?: string
  /** 服务端签发的 `ttwid`（设备标识）；与访客 id 相互独立，可能只有它 */
  ttwid?: string
}

/** 从 cookie 串里取访客 id（两种拼写都认）；没有时 `undefined` */
const visitorIdOf = (cookie: string): string | undefined => {
  const jar = parseCookie(cookie)
  return jar.UIFID || jar.UIFID_TEMP || undefined
}

/** 从 cookie 串解回「服务端给了什么」；序列化是规范形式，解析回去不丢字段 */
const handshakeOf = (cookie: string): DouyinGuestHandshake => {
  const jar = parseCookie(cookie)
  const visitorId = visitorIdOf(cookie)
  return { cookie, ...(visitorId ? { visitorId } : {}), ...(jar.ttwid ? { ttwid: jar.ttwid } : {}) }
}

/** 一次握手到手的 cookie 串 → 结构化结果；一项都没有（真的一无所得）时 `null` */
const credentialOf = (jar: Record<string, string>): DouyinGuestHandshake | null => {
  const cookie = guestCookie(jar)
  return cookie ? handshakeOf(cookie) : null
}

const validEntry = (entry: unknown, userAgent: string): entry is CacheEntry => {
  if (!entry || typeof entry !== 'object') return false
  const item = entry as Partial<CacheEntry>
  if (typeof item.cookie !== 'string' || /[\r\n]/.test(item.cookie) || item.userAgent !== userAgent || typeof item.mintedAt !== 'number')
    return false
  // 降级结果（只有 `ttwid`）本来就不写入，读这一侧同样不认 —— 与写入那道闸门对称，
  // 顺带挡住空串 / 手改过的缓存文件
  if (!visitorIdOf(item.cookie)) return false
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

const doMint = async (options: MintDouyinGuestCookieOptions): Promise<DouyinGuestHandshake | null> => {
  try {
    const jar: Record<string, string> = Object.create(null)
    const first = await getHome(options, '')
    if (first.status < 200 || first.status >= 400) return null
    mergeResponseCookies(jar, first)
    // 第一发就带访客 id 的（服务端直接签发）不必再走挑战
    if (jar.UIFID || jar.UIFID_TEMP) return credentialOf(jar)
    if (!jar.__ac_nonce) return null
    const signature = signDouyinGuestChallenge(jar.__ac_nonce, credentialUserAgent(options))
    if (!signature) return null
    jar.__ac_signature = signature
    const second = await getHome(options, serializeCookie(jar))
    if (second.status < 200 || second.status >= 400) return null
    mergeResponseCookies(jar, second)
    // **第二发到手什么就交什么**：没有访客 id 也算有产出（`ttwid` 是服务端签发的设备
    // 标识，实测单独一个就能打通直播间 `webcast/room/web/enter/`，见 `./ttwid.ts`）。
    // 真正的「什么都没拿到」才回 null —— 旧实现按「访客 id 必须有」判整次握手失败，
    // 把已经到手的 `ttwid` 一起丢了。
    return credentialOf(jar)
  } catch {
    return null
  }
}

/**
 * 握手并交出**结构化**结果，缓存未命中时请求抖音首页。
 *
 * 首发拿 `__ac_nonce`，`__ac_signature` 纯算（见 `./guestChallenge.ts`），再发一次换
 * 凭据。挑战页不解析、不执行。普通数据端点不会自动触发这条握手，必须由宿主主动调用。
 * 默认缓存仅在内存中；configureDouyinGuestCache 可启用磁盘存储。同一 transport
 * 作用域内的并发请求共享同一次获取。
 *
 * **降级结果不进缓存**：只拿到 `ttwid`、没有访客 id 的那一发与「什么都没拿到」一样
 * 每次都重试 —— 与 `./mint.ts` 的 ttwid 回落同一条纪律（缓了就等于在整个进程生命周期里
 * 放弃再铸一次真访客 id 的机会）。代价是那条路每次调用都重发两发，而它本来就是坏的。
 * @param options - 传输与 UA 选项
 * @returns 结构化握手结果；失败或一无所得时 `null`
 */
export const mintDouyinGuestHandshake = async (options: MintDouyinGuestCookieOptions = {}): Promise<DouyinGuestHandshake | null> => {
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
  if (!options.force && validEntry(hit, userAgent)) return handshakeOf(hit.cookie)
  const pending = inflight.get(key)
  if (pending) return pending
  const task = doMint(options).then((handshake) => {
    if (handshake?.visitorId && epoch === generation) {
      const entry = { cookie: handshake.cookie, userAgent, mintedAt: Date.now() }
      cached.delete(key)
      cached.set(key, entry)
      if (cached.size > MAX_CACHE_ENTRIES) cached.delete(cached.keys().next().value!)
      if (file) saveToDisk(file, entry)
    }
    return handshake
  })
  inflight.set(key, task)
  try {
    return await task
  } finally {
    if (inflight.get(key) === task) inflight.delete(key)
  }
}

/**
 * 显式获取服务端签发的游客凭据，缓存未命中时请求抖音首页。
 *
 * 是 {@link mintDouyinGuestHandshake} 的**串形态**，公开出口（经 `./utils.ts` 导出）。
 * 返回类型没变（`string | null`），但**返回 `null` 的判据变了**：以前是「没拿到访客 id」，
 * 现在是「这一发什么都没拿到」。服务端只发了 `ttwid` 而扣下 `UIFID_TEMP` 时，这里交出
 * `ttwid=…` —— 调用方要分「拿到游客凭据」与「只拿到设备标识」请用结构化那一支
 * （`./credential.ts` 就是那么做的）。
 *
 * 挑战页不解析、不执行。普通数据端点不会自动触发这条握手，必须由宿主主动调用。
 * @param options - 传输与 UA 选项
 * @returns 到手的凭据串；失败或一无所得时 `null`
 */
export const mintDouyinGuestCookie = async (options: MintDouyinGuestCookieOptions = {}): Promise<string | null> =>
  (await mintDouyinGuestHandshake(options))?.cookie ?? null
