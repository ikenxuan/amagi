/** @see https://github.com/Cialle/RedCrack */
import { createCipheriv, randomBytes, randomUUID } from 'node:crypto'

import { getCookieValue, type XiaohongshuSessionInput } from '../../../contracts/cookie'
import type { EndpointCtx } from '../../../contracts/endpoint'
import { EndpointError } from '../../../contracts/error'
import { AmagiHeaders, type HeadersInput, type RawResponse, type RequestConfig, type RequestSpec } from '../../../contracts/request'
import { generateSecChUa } from '../../../contracts/ua'
import { parseJsonBigintSafe } from '../../../transport/safeJson'
import { createXiaohongshuSession } from '../session'
import { createXiaohongshuCryptoConfig } from './config'
import { a1PlatformDigit, createWebSskExchange, FingerprintGenerator, SessionManager, type WebSskExchange, Xhshow } from './xhshow'

/** 游客会话在内存中维护的 Cookie 键值映射。 */
type CookieJar = Record<string, string>

/** scripting 接口中用于解出风控 Cookie 的响应结构。 */
type ScriptingResponse = {
  data?: {
    data?: string
    secPoisonId?: string
  }
}

/** 小红书 Web 端游客会话初始化使用的浏览器请求头。 */
const GUEST_HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'content-type': 'application/json;charset=UTF-8',
  origin: 'https://www.xiaohongshu.com',
  priority: 'u=1, i',
  referer: 'https://www.xiaohongshu.com/',
  'sec-ch-ua': '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'
} as const

/**
 * 游客会话初始化请求的响应形状。
 *
 * 游客会话初始化经注入的 `send` 走 transport —— 调用方配置的 proxy / agent / 超时
 * 因此生效。`send` 的形状与 `EndpointCtx['send']` 一致：收 `RequestSpec`、
 * 返 `RawResponse`。多条 `Set-Cookie` 从 `RawResponse.setCookie`（原始数组）逐条取，
 * 不走 `headers`（那里会被 join 成一条）。
 */
type GuestCookieSend = (spec: RequestSpec) => Promise<RawResponse>

/** 与 `./xhshow` 的 SSK 提取器相同的字段顺序；字段存在但无效时不得当作未下发。 */
const SSK_RESPONSE_CONTAINERS = [
  [],
  ['login_info'],
  ['loginInfo'],
  ['data'],
  ['data', 'login_info'],
  ['data', 'loginInfo'],
  ['data', 'ext']
] as const

/** 生成 a1 随机段时使用的 Web 端字符集。 */
const COOKIE_RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyz1234567890'

/** 将 Cookie Jar 序列化为可直接写入 HTTP Cookie 请求头的字符串。 */
const toCookieString = (cookies: CookieJar): string =>
  Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')

/** 将响应头中的 Set-Cookie 字段合并到当前游客会话的 Cookie Jar。 */
const updateCookiesFromResponse = (cookies: CookieJar, setCookie: string[] | string | undefined): void => {
  const headers = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []

  for (const header of headers) {
    const [nameValue] = header.split(';', 1)
    const separatorIndex = nameValue.indexOf('=')
    if (separatorIndex > 0) {
      cookies[nameValue.slice(0, separatorIndex).trim()] = nameValue.slice(separatorIndex + 1).trim()
    }
  }
}

/**
 * 按小红书 Web 端规则生成 a1，以及由 a1 派生的 webId。
 *
 * a1 = `body(46)` + `checksum(6)`，共 52 位。**关键不变式**（真机 code:0 验证）：
 *   `String(crc32(a1[:46])).slice(0, 6) === a1[46:52]`
 * 即校验位是 body 的 crc32 十进制字符串**前 6 位**，且 body 恰好 46 位。
 *
 * body 结构（逆自前端 `generateLocalId`，crc32 + webId 三份真机样本全部命中）：
 *   `Date.now().toString(16)` + 随机串 + `平台码(1)` + `sU('0')` + `'000'`
 * Windows 的平台码是 `5`（other），所以 Windows UA 下尾部是 `50000` —— 与 xhshow-ts
 * dev.ts 那份真机 a1 `196d54a86df7…ielezi1r50000628328` 一致。amagi 更早的手搓版
 * 写成 `"5000"`（少一个 0），crc 对错误结构算，疑为被风控降权（search 回 -104、
 * homefeed 回 461）。
 *
 * **不直接用 `Xhshow.generateA1()`**：它把平台位写死成 `5`，而这里的平台位必须跟着
 * 实际请求 UA 走（{@link a1PlatformDigit}，与 `x-s-common` 的 `s0` 同一套映射）——
 * 同一次请求里「a1 平台位」和「s0」指向不同平台就自相矛盾。Windows UA 下两者产出
 * 结构相同；webId 仍用库的 `Xhshow.generateWebId`。
 */
const A1_BODY_LENGTH = 46
const A1_CHECKSUM_LENGTH = 6

const generateA1AndWebId = (userAgent?: string): Pick<CookieJar, 'a1' | 'webId'> => {
  const timestamp = Date.now().toString(16)
  // 尾部 5 位 = 平台码 + sU('0') + '000'。平台码随 UA 变，其余固定。
  const suffix = `${a1PlatformDigit(userAgent)}0000`
  const fillLength = A1_BODY_LENGTH - timestamp.length - suffix.length
  const randomPart = Array.from(
    randomBytes(Math.max(fillLength, 0)),
    (byte) => COOKIE_RANDOM_CHARS[byte % COOKIE_RANDOM_CHARS.length]
  ).join('')
  const body = `${timestamp}${randomPart}${suffix}`.slice(0, A1_BODY_LENGTH)
  const checksum = String(crc32(body)).slice(0, A1_CHECKSUM_LENGTH)
  const a1 = `${body}${checksum}`

  return { a1, webId: Xhshow.generateWebId(a1) }
}

/** 计算与浏览器端实现兼容的无符号 CRC32 校验值。 */
const crc32 = (input: string): number => {
  let value = 0xffffffff
  for (const byte of Buffer.from(input)) {
    value ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1
    }
  }
  return (value ^ 0xffffffff) >>> 0
}

/** 从 scripting 接口返回的 VMP 数据中解码 websectiga Cookie。 */
const generateWebsectiga = (payload: string): string => {
  const bMatch = payload.match(/"b":"(.*?)",/)
  const dMatch = payload.match(/"d":(.*?)\}\)/)
  if (!bMatch || !dMatch) {
    throw new Error('小红书 scripting 响应格式异常，无法生成 websectiga')
  }

  const decoderData = JSON.parse(dMatch[1]) as Record<number, number>
  const encoded = Buffer.from(bMatch[1], 'base64').toString('utf8')
  const logicList: number[][] = []
  for (let index = 0; index < encoded.length; index += 5) {
    logicList.push(Array.from(encoded.slice(index, index + 5), (char) => char.charCodeAt(0) - 1))
  }

  const start = decoderData[92]
  const end = decoderData[93]
  const target = logicList.slice(start, end + 1)
  const key = Array.from({ length: 64 }, (_, index) => {
    const item = target[675 + index * 2]
    if (!item) throw new Error('小红书 scripting 响应缺少 websectiga 解码数据')
    return decoderData[item[2]]
  })

  return Array.from({ length: 8 }, (_, group) => {
    const offset = 56 - group * 8
    return String.fromCharCode(...key.slice(offset, offset + 8))
  }).join('')
}

/** 将浏览器指纹编码为 webprofile 接口要求的 DES-ECB profileData。 */
const encryptProfileData = (fingerprint: Record<string, unknown>, desKey: string): string => {
  const encoded = Buffer.from(JSON.stringify(fingerprint)).toString('base64')
  const blockSize = 8
  const padding = blockSize - (encoded.length % blockSize)
  const plaintext = Buffer.concat([Buffer.from(encoded), Buffer.alloc(padding)])

  // Node.js exposes Triple-DES but not single-DES on OpenSSL 3. K1=K2=K3 is
  // equivalent to the DES-ECB operation used by the webprofile protocol.
  const cipher = createCipheriv('des-ede3', Buffer.from(desKey.repeat(3)), null)
  cipher.setAutoPadding(false)
  return Buffer.concat([cipher.update(plaintext), cipher.final()]).toString('hex')
}

/**
 * 将 scripting 的 JSON 或 JSONP 响应统一还原为结构化数据。
 *
 * 解析统一走 `parseJsonBigintSafe`，不在这里留绕过安全解析器的路径。
 */
const unwrapScriptingResponse = (data: unknown): ScriptingResponse => {
  if (typeof data === 'string') {
    const json = data.match(/^[^(]+\((.*)\)$/s)?.[1]
    return parseJsonBigintSafe(json ?? data) as ScriptingResponse
  }
  return data as ScriptingResponse
}

/**
 * 创建小红书 Web 端游客会话及可选的 SSK。
 *
 * 生成 a1/webId，完成 scripting、webprofile 与 activate，返回绑定的 Cookie 与签名材料。
 * 未下发 SSK 时仍保留原有 Cookie-only 行为；这不代表业务请求已通过验证。
 *
 * 会话请求经注入的 `send` 走 transport —— 调用方配的
 * proxy / agent / 超时对它生效；请求头、响应处理与 Cookie 合并逻辑
 * 不随发送方式改变。
 * @param send - 注入的底层发送函数（来自 transport）
 * @param requestConfig - 调用方请求配置，透传
 * @returns 与最终 Cookie 绑定的游客会话
 */
export const createXiaohongshuGuestSession = async (
  send: GuestCookieSend,
  requestConfig?: RequestConfig
): Promise<XiaohongshuSessionInput> => {
  const callerHeaders = new AmagiHeaders(requestConfig?.headers as HeadersInput)
  const baseHeaders = new AmagiHeaders(GUEST_HEADERS).merge(requestConfig?.headers as HeadersInput)
  const effectiveUserAgent = baseHeaders.get('user-agent') ?? GUEST_HEADERS['user-agent']
  // sec-ch-ua 跟着实际 UA 走；调用方显式给了才用调用方的
  if (!callerHeaders.has('sec-ch-ua')) baseHeaders.set('sec-ch-ua', generateSecChUa(effectiveUserAgent))
  // 签名配置跟着实际请求 UA 走：s0 / x2 / DATA_PLATFORM 与 a1 平台位、
  // webprofile 指纹必须指向同一个平台。
  const cryptoConfig = createXiaohongshuCryptoConfig(effectiveUserAgent)
  const signer = new Xhshow(cryptoConfig)
  const session = new SessionManager(cryptoConfig)
  const acceptSsk = (response: unknown, exchange: WebSskExchange): void => {
    try {
      let key: string | undefined
      for (const path of SSK_RESPONSE_CONTAINERS) {
        let node: unknown = response
        for (const name of path) {
          node = node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[name] : undefined
        }
        if (node === null || typeof node !== 'object' || !Object.hasOwn(node, 'ssk')) continue
        const encrypted = (node as Record<string, unknown>).ssk
        if (typeof encrypted !== 'string' || !encrypted || encrypted.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encrypted)) {
          throw new Error()
        }
        // 所有已下发字段都必须可解密；有效时保留 xhshow-ts 的首字段优先级。
        const accepted = exchange.acceptEncryptedSsk(encrypted)
        key ??= accepted
      }
      if (key !== undefined) session.setWebSsk({ 'xhs-pc-web': key })
    } catch {
      throw new Error('小红书游客 SSK 交换失败')
    }
  }
  const cookies: CookieJar = {
    ...generateA1AndWebId(effectiveUserAgent),
    webBuild: cryptoConfig.DATA_WEB_BUILD,
    xsecappid: 'xhs-pc-web',
    loadts: String(Date.now()),
    abRequestId: randomUUID()
  }

  /** 发送会话初始化请求，并将响应中的 Set-Cookie 合并回当前 Cookie Jar。 */
  const request = async <T>(url: string, data: Record<string, unknown>, signed = false) => {
    const signatureHeaders = signed ? signer.signHeadersPost(new URL(url).pathname, cookies, 'xhs-pc-web', data, undefined, session) : {}
    const response = await send({
      method: 'POST',
      url,
      body: data,
      headers: baseHeaders.clone().merge(signatureHeaders).set('Cookie', toCookieString(cookies)).toJSON()
    })

    const setCookie = response.setCookie
    updateCookiesFromResponse(cookies, setCookie)
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`小红书游客会话初始化失败：${url} 返回 HTTP ${response.status}`)
    }
    return response.body as T
  }

  const scriptingResponse = unwrapScriptingResponse(
    await request<unknown>('https://as.xiaohongshu.com/api/sec/v1/scripting', { callFrom: 'web', callback: 'seccallback' })
  )
  const scriptingData = scriptingResponse.data
  if (!scriptingData?.data || !scriptingData.secPoisonId) {
    throw new Error('小红书 scripting 响应缺少游客会话数据')
  }

  cookies.websectiga = generateWebsectiga(scriptingData.data)
  cookies.sec_poison_id = scriptingData.secPoisonId

  const fingerprint = new FingerprintGenerator(cryptoConfig).generate(cookies, effectiveUserAgent)
  const profileExchange = createWebSskExchange(cryptoConfig.SSK_SERVER_PUBLIC_KEY)
  const profileResponse = await request(
    cryptoConfig.GID_URL,
    {
      platform: cryptoConfig.DATA_PLATFORM,
      profileData: encryptProfileData(fingerprint, cryptoConfig.DES_KEY),
      sdkVersion: cryptoConfig.DATA_SDK_VERSION,
      svn: cryptoConfig.DATA_SVN,
      ext: { cpk: profileExchange.clientPublicKeyBase64 }
    },
    true
  )
  acceptSsk(profileResponse, profileExchange)
  const activateExchange = createWebSskExchange(cryptoConfig.SSK_SERVER_PUBLIC_KEY)
  const activateResponse = await request(
    'https://edith.xiaohongshu.com/api/sns/web/v1/login/activate',
    { client_public_key_base64: activateExchange.clientPublicKeyBase64 },
    true
  )
  acceptSsk(activateResponse, activateExchange)

  if (!cookies.web_session) {
    throw new Error('小红书游客会话初始化失败：未获取到 web_session')
  }
  return createXiaohongshuSession({ cookie: toCookieString(cookies), webSsk: session.webSsk })
}

/** 旧 API 仅返回 Cookie；需要签名材料时使用 createXiaohongshuGuestSession。 */
export const createXiaohongshuGuestCookie = async (send: GuestCookieSend, requestConfig?: RequestConfig): Promise<string> =>
  (await createXiaohongshuGuestSession(send, requestConfig)).cookie

/**
 * 游客会话铸造函数：供 {@link prepareXiaohongshuGuestCookie} 注入，默认实现即
 * {@link createXiaohongshuGuestSession}（Cookie + SSK）。测试据此注入假铸造，验证
 * 「降级 / 缓存 / 去重 / reset」的接线本身，而不必合成一份真实的 scripting VMP 响应。
 * 返回纯 Cookie 串的铸造也接受（视作没有 SSK 的会话）。
 */
type GuestSessionMint = (send: GuestCookieSend, requestConfig?: RequestConfig) => Promise<XiaohongshuSessionInput | string>

/** 游客会话复用时长：到期后下一次调用重新初始化 */
const GUEST_TTL_MS = 5 * 60 * 1000
/** 每个 transport 下最多缓存的配置组合数，防异常 UA / 配置把缓存撑爆 */
const MAX_CACHED_CONFIGS = 32

/** 一条缓存：进行中的铸造也在这里，并发首调共享同一个 promise（in-flight 去重） */
interface GuestSessionEntry {
  promise: Promise<XiaohongshuSessionInput | string>
  pending: boolean
  expiresAt: number
}

/**
 * 游客会话缓存，两级键：
 * - 外层按 transport 身份（`ctx.transportIdentity ?? ctx.send`）隔离 —— 不同 client
 *   即使 clientId / adapter 相同也不共享；WeakMap 让 client 销毁后条目可回收。
 * - 内层按「UA + 请求配置 + 当前 cookie」的规范化值分键 —— 游客会话与出口 IP、指纹
 *   绑定，换 UA / 代理 / 请求头就是另一份会话。adapter、agent、abort signal 按引用隔离。
 *
 * 用 `let` 是为了 {@link resetXiaohongshuGuestCookieCache} 能整体换掉它。
 */
let guestSessions = new WeakMap<object, Map<string, GuestSessionEntry>>()
const references = new WeakMap<object, number>()
let nextReference = 0

/**
 * 清空游客会话缓存（含在途铸造的去重槽位）。
 *
 * 测试、以及「换出口 IP / 轮换代理」后旧会话失配时用：缓存是模块级的，不清会在 TTL
 * 内一直复用。在途的铸造照常完成并交给已在等它的调用方，但不会写回新缓存。
 */
export const resetXiaohongshuGuestCookieCache = (): void => {
  guestSessions = new WeakMap()
}

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

/** prepare 实际读到的上下文字段 */
type GuestPrepareCtx = Pick<EndpointCtx, 'cookie' | 'userAgent' | 'requestConfig' | 'send' | 'transportIdentity'>

const configKey = (ctx: GuestPrepareCtx): string => {
  const headers = new AmagiHeaders(ctx.requestConfig.headers as HeadersInput).set('User-Agent', ctx.userAgent)
  const normalized = Object.fromEntries(headers.toEntries().map(([key, value]) => [key.toLowerCase(), value]))
  return JSON.stringify(configValue({ cookie: ctx.cookie, ...ctx.requestConfig, headers: normalized }))
}

/** 只淘汰已完成的条目，让并发调用方继续共享进行中的初始化。 */
const pruneSessions = (cache: Map<string, GuestSessionEntry>): void => {
  const now = Date.now()
  for (const [key, session] of cache) {
    if (!session.pending && (session.expiresAt <= now || cache.size > MAX_CACHED_CONFIGS)) cache.delete(key)
  }
}

const guestSession = (ctx: GuestPrepareCtx, mint: GuestSessionMint): Promise<XiaohongshuSessionInput | string> => {
  const owner = ctx.transportIdentity ?? ctx.send
  let cache = guestSessions.get(owner)
  if (!cache) {
    cache = new Map()
    guestSessions.set(owner, cache)
  }
  pruneSessions(cache)
  const key = configKey(ctx)
  const current = cache.get(key)
  if (current) return current.promise

  const entry: GuestSessionEntry = {
    pending: true,
    expiresAt: 0,
    promise: mint((spec) => ctx.send(spec, 'prepare'), {
      ...ctx.requestConfig,
      // 会话初始化与主请求用同一个 UA：a1 平台位、webprofile 指纹与签名配置都由它派生
      headers: new AmagiHeaders(ctx.requestConfig.headers as HeadersInput).set('User-Agent', ctx.userAgent).toJSON()
    }).then(
      (session) => {
        entry.pending = false
        entry.expiresAt = Date.now() + GUEST_TTL_MS
        pruneSessions(cache)
        return session
      },
      (error: unknown) => {
        // 失败不进缓存：并发等它的调用方一起失败，下一次调用重新初始化
        cache.delete(key)
        throw error
      }
    )
  }
  cache.set(key, entry)
  return entry.promise
}

/**
 * 端点 `prepare` 钩子：**下游未传有效用户 Cookie（无 a1）时，用游客会话解析接口**。
 *
 * 由 `defineXiaohongshuEndpoint` 横切注入**全体**小红书端点（含将来新增的）。三种输入：
 * - cookie 里有 a1：视作有效用户凭证，原样放行（`{}`）。
 * - 有 `web_session` / `userId` 却缺 a1：**拒绝**（`auth` / `COOKIE_MISSING`）。这是一份
 *   残缺的登录态，悄悄换成游客会让调用方以为拿的是登录数据，所以不降级。
 * - 其余（空 cookie、只有 webId 之类）：铸造游客会话，返回 `{ cookie, xiaohongshuSession }`
 *   —— 后者带 SSK，签名阶段据此算 x-s 的 x5~x7。
 *
 * 铸造走 `ctx.send(spec, 'prepare')`（而非自带 transport）—— 游客会话初始化的三个请求因此
 * 与主请求同一出口（代理 / agent / 超时 / 出口 IP 一致），trace 里记为 `reason: 'prepare'`；
 * UA 也用主请求的，a1 平台位与签名配置随之派生。小红书游客会话与出口 IP、指纹绑定，同出口
 * 才稳，这也是不走平台级 `ensureCookie`（拿不到 `ctx.send`）而留在 `prepare` 的原因。
 *
 * 缓存：按 transport + UA + 请求配置复用 {@link GUEST_TTL_MS}，并发首调共享同一次铸造，
 * 失败不进缓存（下次调用重试）。会话失效时主请求会被 judge 判失败，调用方可
 * {@link resetXiaohongshuGuestCookieCache} 后重试。
 * @param ctx - 端点执行上下文（取 `cookie` / `userAgent` / `requestConfig` / `send` / `transportIdentity`）
 * @param mint - 铸造函数，默认 {@link createXiaohongshuGuestSession}；测试可注入假铸造
 * @returns 需要升级时返回 `{ cookie, xiaohongshuSession? }`，否则 `{}`（保持原 cookie）
 */
export const prepareXiaohongshuGuestCookie = async (
  ctx: GuestPrepareCtx,
  mint: GuestSessionMint = createXiaohongshuGuestSession
): Promise<Partial<EndpointCtx>> => {
  if (getCookieValue(ctx.cookie, 'a1')) return {}
  if (getCookieValue(ctx.cookie, 'web_session') || getCookieValue(ctx.cookie, 'userId')) {
    throw new EndpointError({
      kind: 'auth',
      code: 'COOKIE_MISSING',
      message: '小红书 Cookie 已包含会话或用户身份，但缺少 a1；请提供同一会话的完整 Cookie。'
    })
  }
  const session = await guestSession(ctx, mint)
  return typeof session === 'string' ? { cookie: session } : { cookie: session.cookie, xiaohongshuSession: session }
}
