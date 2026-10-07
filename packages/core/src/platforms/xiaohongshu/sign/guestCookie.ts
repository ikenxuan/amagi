/** @see https://github.com/Cialle/RedCrack */
import { createCipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'

import { createWebSskExchange, FingerprintGenerator, SessionManager, type WebSskExchange, Xhshow } from '@ikenxuan/xhshow-ts'

import type { XiaohongshuSessionInput } from '../../../contracts/cookie'
import { AmagiHeaders, type HeadersInput, type RawResponse, type RequestConfig, type RequestSpec } from '../../../contracts/request'
import { parseJsonBigintSafe } from '../../../transport/safeJson'
import { createXiaohongshuSession } from '../session'
import { createXiaohongshuCryptoConfig, xiaohongshuPlatformCode } from './config'

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

/** 与上游提取器相同的字段顺序；字段存在但无效时不得当作未下发。 */
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
 *
 * 平台码使用实际请求 UA，与生成 webprofile 指纹所用 UA 保持一致，并与
 * `x-s-common` 的 `s0` 共用 `xiaohongshuPlatformCode`：同一次请求里
 * 「a1 平台位」和「s0」必须指向同一个平台，否则自相矛盾。
 */
const A1_BODY_LENGTH = 46
const A1_CHECKSUM_LENGTH = 6

const generateA1AndWebId = (userAgent?: string): Pick<CookieJar, 'a1' | 'webId'> => {
  const timestamp = Date.now().toString(16)
  // 尾部 5 位 = 平台码 + sU('0') + '000'。平台码随 UA 变，其余固定。
  const suffix = `${xiaohongshuPlatformCode(userAgent)}0000`
  const fillLength = A1_BODY_LENGTH - timestamp.length - suffix.length
  const randomPart = Array.from(
    randomBytes(Math.max(fillLength, 0)),
    (byte) => COOKIE_RANDOM_CHARS[byte % COOKIE_RANDOM_CHARS.length]
  ).join('')
  const body = `${timestamp}${randomPart}${suffix}`.slice(0, A1_BODY_LENGTH)
  const checksum = String(crc32(body)).slice(0, A1_CHECKSUM_LENGTH)
  const a1 = `${body}${checksum}`

  return {
    a1,
    webId: createHash('md5').update(a1).digest('hex')
  }
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
  const baseHeaders = new AmagiHeaders(GUEST_HEADERS).merge(requestConfig?.headers as HeadersInput)
  const effectiveUserAgent = baseHeaders.get('user-agent') ?? GUEST_HEADERS['user-agent']
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
        // 所有已下发字段都必须可解密；有效时保留上游的首字段优先级。
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
