/** @see https://github.com/Cialle/RedCrack */
import { createCipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'

import { FingerprintGenerator, Xhshow } from '@ikenxuan/xhshow-ts'
import axios, { AxiosRequestConfig } from 'axios'

import { createXiaohongshuCryptoConfig } from './config'

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

/** 按小红书 Web 端规则生成 a1，以及由 a1 派生的 webId。 */
const generateA1AndWebId = (): Pick<CookieJar, 'a1' | 'webId'> => {
  const timestamp = Date.now().toString(16)
  const randomPart = Array.from(randomBytes(30), (byte) => COOKIE_RANDOM_CHARS[byte % COOKIE_RANDOM_CHARS.length]).join('')
  const source = `${timestamp}${randomPart}5000`
  const checksum = crc32(source)
  const a1 = `${source}${checksum}`.slice(0, 52)

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

/** 将 scripting 的 JSON 或 JSONP 响应统一还原为结构化数据。 */
const unwrapScriptingResponse = (data: unknown): ScriptingResponse => {
  if (typeof data === 'string') {
    const json = data.match(/^[^(]+\((.*)\)$/s)?.[1]
    return JSON.parse(json ?? data) as ScriptingResponse
  }
  return data as ScriptingResponse
}

/**
 * 创建小红书 Web 端游客会话 Cookie。
 *
 * 该流程对应 Web 端首次访问时的 Cookie 初始化：生成 a1/webId，完成
 * scripting、webprofile 与 activate 三个会话请求，并返回最终 Cookie 字符串。
 */
export const createXiaohongshuGuestCookie = async (requestConfig?: AxiosRequestConfig): Promise<string> => {
  const cryptoConfig = createXiaohongshuCryptoConfig()
  const signer = new Xhshow(cryptoConfig)
  const cookies: CookieJar = {
    ...generateA1AndWebId(),
    webBuild: cryptoConfig.DATA_WEB_BUILD,
    xsecappid: 'xhs-pc-web',
    loadts: String(Date.now()),
    abRequestId: randomUUID()
  }

  const { headers: requestHeaders, params: _params, ...transportConfig } = requestConfig ?? {}
  /** 发送会话初始化请求，并将响应中的 Set-Cookie 合并回当前 Cookie Jar。 */
  const request = async <T>(url: string, data: Record<string, unknown>, signed = false) => {
    const signatureHeaders = signed ? signer.signHeadersPost(new URL(url).pathname, cookies, 'xhs-pc-web', data) : {}
    const response = await axios<T>({
      ...transportConfig,
      method: 'POST',
      url,
      data,
      validateStatus: () => true,
      headers: {
        ...GUEST_HEADERS,
        ...requestHeaders,
        ...signatureHeaders,
        Cookie: toCookieString(cookies)
      }
    })

    updateCookiesFromResponse(cookies, response.headers['set-cookie'])
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`小红书游客会话初始化失败：${url} 返回 HTTP ${response.status}`)
    }
    return response.data
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

  const fingerprint = new FingerprintGenerator(cryptoConfig).generate(cookies, GUEST_HEADERS['user-agent'])
  await request(
    cryptoConfig.GID_URL,
    {
      platform: cryptoConfig.DATA_PLATFORM,
      profileData: encryptProfileData(fingerprint, cryptoConfig.DES_KEY),
      sdkVersion: cryptoConfig.DATA_SDK_VERSION,
      svn: cryptoConfig.DATA_SVN
    },
    true
  )
  await request('https://edith.xiaohongshu.com/api/sns/web/v1/login/activate', {}, true)

  if (!cookies.web_session) {
    throw new Error('小红书游客会话初始化失败：未获取到 web_session')
  }
  return toCookieString(cookies)
}
