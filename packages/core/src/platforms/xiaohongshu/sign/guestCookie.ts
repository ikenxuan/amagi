/** @see https://github.com/Cialle/RedCrack */
import { createCipheriv, randomUUID } from 'node:crypto'

import { getCookieValue } from '../../../contracts/cookie'
import type { EndpointCtx } from '../../../contracts/endpoint'
import type { RawResponse, RequestConfig, RequestSpec } from '../../../contracts/request'
import { createXiaohongshuCryptoConfig } from './config'
import { FingerprintGenerator, Xhshow } from './xhshow'

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

/**
 * 生成 a1，以及由 a1 派生的 webId —— 直接用 `./xhshow` 的纯算实现。
 *
 * 逆向实证（xhshow-ts dev.ts 里一份真机 a1
 * `196d54a86df7…ielezi1r50000628328`）：a1 结构是 `hex(ts) + rand + "50000" + crc32`，
 * 常量段是 **`50000`**。amagi 旧的手搓版写成 `"5000"`（少一个 0），a1 内部 crc 因此是
 * 对错误结构算的 —— 虽也能换到 web_session，但疑为被风控降权（search 回 -104、homefeed
 * 回 461）。改用 `Xhshow.generateA1 / generateWebId` 对齐真实格式。
 */
const generateA1AndWebId = (): Pick<CookieJar, 'a1' | 'webId'> => {
  const a1 = Xhshow.generateA1()
  return { a1, webId: Xhshow.generateWebId(a1) }
}

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
 *
 * 会话请求经注入的 `send` 走 transport —— 调用方配的
 * proxy / agent / 超时对它生效；请求头、响应处理与 Cookie 合并逻辑
 * 不随发送方式改变。
 * @param send - 注入的底层发送函数（来自 transport）
 * @param requestConfig - 调用方请求配置，透传
 * @returns 游客 Cookie 字符串
 */
export const createXiaohongshuGuestCookie = async (send: GuestCookieSend, requestConfig?: RequestConfig): Promise<string> => {
  const cryptoConfig = createXiaohongshuCryptoConfig()
  const signer = new Xhshow(cryptoConfig)
  const cookies: CookieJar = {
    ...generateA1AndWebId(),
    webBuild: cryptoConfig.DATA_WEB_BUILD,
    xsecappid: 'xhs-pc-web',
    loadts: String(Date.now()),
    abRequestId: randomUUID()
  }

  const { headers: requestHeaders } = requestConfig ?? {}
  /** 发送会话初始化请求，并将响应中的 Set-Cookie 合并回当前 Cookie Jar。 */
  const request = async <T>(url: string, data: Record<string, unknown>, signed = false) => {
    const signatureHeaders = signed ? signer.signHeadersPost(new URL(url).pathname, cookies, 'xhs-pc-web', data) : {}
    const response = await send({
      method: 'POST',
      url,
      body: data,
      headers: {
        ...GUEST_HEADERS,
        ...(requestHeaders as Record<string, string>),
        ...signatureHeaders,
        Cookie: toCookieString(cookies)
      }
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

/**
 * 游客会话铸造函数签名：供 {@link prepareXiaohongshuGuestCookie} 注入，默认实现即
 * {@link createXiaohongshuGuestCookie}。测试据此注入假铸造，验证「降级 / 缓存 / 去重」
 * 的接线本身，而不必合成一份真实的 scripting VMP 响应。
 */
type GuestCookieMint = (send: GuestCookieSend, requestConfig?: RequestConfig) => Promise<string>

/**
 * 游客 Cookie 进程级缓存：键为 UA、值为铸造好的 Cookie 串。
 *
 * 铸造一次要走 scripting → webprofile → activate 三个真实会话请求，开销不小；匿名
 * 游客会话在进程内可复用，故按 UA 缓存（指纹由 UA 参与生成，不同 UA 视作不同会话）。
 */
const guestCookieCache = new Map<string, string>()
/** in-flight 去重：并发首调共享同一次铸造，避免并发打出多份会话初始化 */
const inflightGuestMint = new Map<string, Promise<string>>()
/** 缓存条目上限，防异常 UA 把缓存撑爆 */
const GUEST_CACHE_MAX_ENTRIES = 32

/**
 * 清空游客 Cookie 进程级缓存与在途铸造。
 *
 * 测试、以及「换出口 IP / 轮换代理」后旧会话失配时用：缓存是模块级的，不清会一直复用。
 */
export const resetXiaohongshuGuestCookieCache = (): void => {
  guestCookieCache.clear()
  inflightGuestMint.clear()
}

/**
 * 端点 `prepare` 钩子：**下游未传有效用户 Cookie（无 a1）时，用游客 Cookie 解析接口**。
 *
 * 判据沿用既有约定（见 fetcher 测试「cookie 带 a1 时不再跑 guest-cookie 前置请求」）：
 * cookie 里有 a1 视作有效用户凭证、原样放行；没有就铸造一份游客 Cookie 顶上。铸造走
 * `ctx.send`（而非自带 transport）—— 游客会话初始化的三个请求因此与主请求同一出口
 * （代理 / agent / 超时 / 出口 IP 一致）；小红书游客会话与出口 IP、指纹绑定，同出口才稳，
 * 这也是不走平台级 `ensureCookie`（拿不到 `ctx.send`）而留在 `prepare` 的原因。
 *
 * 铸造结果按 UA 进程级缓存并对并发去重：重复调用只铸一次。会话失效时主请求会被 judge
 * 判失败，调用方可 {@link resetXiaohongshuGuestCookieCache} 后重试。
 * @param ctx - 端点执行上下文（取 `cookie` / `userAgent` / `requestConfig` / `send`）
 * @param mint - 铸造函数，默认 {@link createXiaohongshuGuestCookie}；测试可注入假铸造
 * @returns 需要升级时返回 `{ cookie }`，否则 `{}`（保持原 cookie）
 */
export const prepareXiaohongshuGuestCookie = async (
  ctx: Pick<EndpointCtx, 'cookie' | 'userAgent' | 'requestConfig' | 'send'>,
  mint: GuestCookieMint = createXiaohongshuGuestCookie
): Promise<Partial<EndpointCtx>> => {
  if (getCookieValue(ctx.cookie, 'a1')) return {}

  const key = ctx.userAgent || ''
  const cached = guestCookieCache.get(key)
  if (cached !== undefined) return { cookie: cached }

  let pending = inflightGuestMint.get(key)
  if (pending === undefined) {
    pending = (async () => {
      try {
        const cookie = await mint(ctx.send, ctx.requestConfig)
        guestCookieCache.set(key, cookie)
        if (guestCookieCache.size > GUEST_CACHE_MAX_ENTRIES) {
          const oldest = guestCookieCache.keys().next().value
          if (oldest !== undefined) guestCookieCache.delete(oldest)
        }
        return cookie
      } finally {
        // 失败不进缓存，且无论成败都释放在途槽位，让下次调用能重试
        inflightGuestMint.delete(key)
      }
    })()
    inflightGuestMint.set(key, pending)
  }
  return { cookie: await pending }
}
