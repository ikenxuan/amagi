import vm from 'node:vm'

import axios from 'axios'

import { extractUifidFromCookie } from './sign/secsdkWebSign'

/**
 * 抖音访客 id（`UIFID_TEMP`）的铸造与 cookie 审计。
 *
 * 受 secsdk 保护的端点（`/aweme/v1/web/music/detail/` 等）要求 cookie 里带访客 id，
 * 而它不由登录颁发——passport 扫码链路只发身份 cookie。缺了它，受保护端点稳定回
 * `403 Uifid Not Found`（见 `judge.ts` 的 `SIGNATURE_REFUSED` 归因）。
 *
 * 铸造是纯 HTTP 的，三步：
 *
 * 1. `GET www.douyin.com` → 服务端发 `__ac_nonce`，响应体是一份挑战页（内联
 *    byted_acrawler 本体 + 引导脚本 `init({aid: 99999999, dfp: 0})` 与
 *    `sign("", nonce)`）；
 * 2. 在 Node `vm` 里执行本体，离线算出 `__ac_signature`；
 * 3. 带 `__ac_nonce + __ac_signature` 再 GET 一次 → 服务端一次性 Set-Cookie：
 *    `ttwid` + `web_sign_token` + `UIFID_TEMP`。
 *
 * acrawler 本体不进仓库——每次铸造从挑战页现取现执行，抖音更新算法时自动跟随。
 * 同一客户端上下文（IP + UA）重复铸造返回同一个 `UIFID_TEMP`（有效期约 500 天），
 * 进程内缓存一次即可。
 *
 * 接线：`PLATFORM_RUNTIME.douyin.ensureCookie` 在每次请求 prepare 之后审计
 * （prepare 可能整串换 cookie，审计要对最终生效的那份负责）；`session/qrcode.ts`
 * 在登录完成时审计，让扫码登录直接产出带访客 id 的凭证。
 *
 * 铸造尽力而为：网络失败、挑战页形状变化、签名被拒——一律返回原 cookie，归因
 * 交给 `SIGNATURE_REFUSED`。不抛错：自愈失败不该把调用变成 `internal`。
 *
 * @module platform/douyin/mint
 */

/** 无调用方 UA 时铸造请求的兜底 UA。与 amagi 默认基线同代 */
const DEFAULT_MINT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/** 挑战页引导脚本里的 aid。实测固定为 99999999，从引导块里解析，解析不到用它兜底 */
const AID_FALLBACK = 99999999

/** acrawler 本体的最小长度。挑战页里最大的内联块（实测 ~71KB），低于此视为形状变化 */
const ACGRAWLER_MIN_LENGTH = 10_000

/** 铸造出的访客 cookie */
export interface DouyinMintedVisitor {
  /** 服务端铸造的 `ttwid` */
  ttwid: string
  /** 服务端铸造的 `UIFID_TEMP`（224 位 hex） */
  uifidTemp: string
}

/** 从挑战页解析出的两段 */
export interface ChallengeParts {
  /** byted_acrawler 本体源码（内联 script，最大块） */
  acrawlerSource: string
  /** 引导脚本里的 aid */
  aid: number
}

/**
 * 从挑战页 HTML 里解析 acrawler 本体与引导 aid。
 *
 * 规则刻意保守：取**最大的无 `src` 内联 script 块**当本体（实测 ~71KB，远大于页面
 * 上任何其它内联块），引导块按「提到 `byted_acrawler` 且含 `sign(`」认——两者都不
 * 合格就返回 `undefined`，宁可放弃铸造也不把来路不明的脚本执行一遍。
 * @param html - 挑战页 HTML（首次请求的响应体）
 * @returns 解析结果；形状不对时 `undefined`
 */
export const extractChallengeParts = (html: string): ChallengeParts | undefined => {
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  if (blocks.length === 0) return undefined

  const acrawlerSource = blocks.reduce((a, b) => (b.length > a.length ? b : a))
  if (acrawlerSource.length < ACGRAWLER_MIN_LENGTH) return undefined

  const bootstrap = blocks.find((b) => b !== acrawlerSource && b.includes('byted_acrawler') && b.includes('sign('))
  if (!bootstrap) return undefined

  const aidMatch = bootstrap.match(/aid:(\d+)/)
  return { acrawlerSource, aid: aidMatch ? Number(aidMatch[1]) : AID_FALLBACK }
}

/**
 * 执行 acrawler 本体，返回对任意 nonce 的离线签名函数。
 *
 * shim 只需要 SDK 引用到的环境面：`document.cookie`（nonce 从这里读回，给空串让
 * 签名只依赖入参）、location / navigator / screen / history 与基础内置对象。环境
 * 数据不参与服务端校验（实测假数据可通过），所以 shim 不追求逼真。
 * @param source - acrawler 本体源码
 * @param aid - 引导 aid
 * @param userAgent - 参与签名的 UA（与后续 API 请求保持一致）
 * @returns `sign('', nonce)` 的等价函数
 */
export const createAcrawlerSigner = (source: string, aid: number, userAgent: string): ((nonce: string) => string) => {
  const doc: Record<string, unknown> = {}
  Object.defineProperty(doc, 'cookie', { get: () => '', set: () => {} })
  const windowShim: Record<string, unknown> = {
    document: doc,
    location: {
      href: 'https://www.douyin.com/',
      protocol: 'https:',
      host: 'www.douyin.com',
      hostname: 'www.douyin.com',
      pathname: '/',
      search: '',
      hash: '',
      origin: 'https://www.douyin.com',
      reload: () => {}
    },
    navigator: { userAgent, language: 'zh-CN', platform: 'Win32' },
    screen: { width: 2560, height: 1440 },
    history: { length: 2 },
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Object,
    Array,
    Symbol,
    Error,
    TypeError,
    JSON,
    Math,
    Date,
    Promise,
    Reflect,
    Map,
    Set,
    Number,
    String,
    Boolean,
    RegExp,
    Function,
    parseInt,
    parseFloat,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    TextEncoder,
    URL,
    URLSearchParams,
    performance
  }
  windowShim.window = windowShim
  windowShim.self = windowShim
  windowShim.top = windowShim
  windowShim.parent = windowShim
  windowShim.globalThis = windowShim

  const context = vm.createContext(windowShim)
  vm.runInContext(source, context, { timeout: 20_000 })
  const ac = windowShim.byted_acrawler as { init: (config: unknown) => void; sign: (a: string, b: string) => string } | undefined
  if (!ac?.sign) throw new Error('acrawler 本体未注册 byted_acrawler.sign')

  ac.init({ aid, dfp: 0 })
  return (nonce: string) => ac.sign('', nonce)
}

/** 首页 GET 的可注入出口（测试用）。`setCookies` 是原始 Set-Cookie 行数组 */
export interface MintDeps {
  getHome?: (cookie: string | undefined, userAgent: string) => Promise<{ setCookies: string[]; body: string }>
}

/**
 * 测试环境守卫：vitest 进程内默认出口**不做真实出网请求**（审计在测试里保持透明，
 * 断言 Cookie 透传的用例不该被一次真网铸造改写）。通过 {@link MintDeps.getHome}
 * 注入出口的用例不受影响——守卫只管默认出口。
 */
const testEnvGuard = async (): Promise<never> => {
  throw new Error('douyin visitor mint is disabled under vitest (inject MintDeps.getHome to test it)')
}

/**
 * 运营开关：`AMAGI_DISABLE_DOUYIN_MINT=1` 关闭自动铸造。
 *
 * 铸造是 amagi **自主发起**的出网请求（用户没有显式调用任何端点），出口受限、
 * 安全审计、或「cookie 由我自己全权管理」的环境需要一个明确的选择权。关闭后
 * cookie 保持原样，受保护端点按 `SIGNATURE_REFUSED` 的既有归因失败。注入
 * {@link MintDeps.getHome} 的用例不受影响——开关只管默认出口。
 */
const mintDisabledByEnv = (): boolean => process.env.AMAGI_DISABLE_DOUYIN_MINT === '1'

const defaultGetHome = async (cookie: string | undefined, userAgent: string): Promise<{ setCookies: string[]; body: string }> => {
  if (process.env.VITEST) return testEnvGuard()
  if (mintDisabledByEnv()) return testEnvGuard()
  const response = await axios.get<string>('https://www.douyin.com/', {
    headers: { 'User-Agent': userAgent, Accept: 'text/html', ...(cookie ? { Cookie: cookie } : {}) },
    timeout: 15_000,
    maxRedirects: 5,
    responseType: 'text'
  })
  const setCookies = response.headers['set-cookie'] ?? []
  return { setCookies: Array.isArray(setCookies) ? setCookies : [setCookies], body: String(response.data ?? '') }
}

/** 从 Set-Cookie 行数组里取某个 cookie 的值 */
const setCookieValue = (cookies: string[], name: string): string | undefined => {
  const line = cookies.find((c) => c.startsWith(name + '='))
  return line ? line.split(';')[0].split('=').slice(1).join('=') : undefined
}

/**
 * 铸造一次访客 id（两次 GET + 离线签名）。不做缓存、不去重——那是
 * {@link ensureDouyinVisitorCookie} 的职责。
 * @param userAgent - 铸造请求的 UA（与后续 API 请求保持一致）
 * @param deps - 可注入的 HTTP 出口（测试用）
 * @returns 铸造结果；挑战页形状变化 / 签名被拒 / 网络失败时 `undefined`
 */
export const mintDouyinVisitorCookie = async (userAgent?: string, deps?: MintDeps): Promise<DouyinMintedVisitor | undefined> => {
  const ua = userAgent || DEFAULT_MINT_UA
  const getHome = deps?.getHome ?? defaultGetHome
  try {
    const first = await getHome(undefined, ua)
    const nonce = setCookieValue(first.setCookies, '__ac_nonce')
    if (!nonce) return undefined

    const parts = extractChallengeParts(first.body)
    if (!parts) return undefined

    const sign = createAcrawlerSigner(parts.acrawlerSource, parts.aid, ua)
    const signature = sign(nonce)

    const second = await getHome(`__ac_nonce=${nonce}; __ac_signature=${signature}`, ua)
    const ttwid = setCookieValue(second.setCookies, 'ttwid')
    const uifidTemp = setCookieValue(second.setCookies, 'UIFID_TEMP')
    if (!ttwid || !uifidTemp) return undefined
    return { ttwid, uifidTemp }
  } catch {
    return undefined
  }
}

/**
 * 把铸造结果合并进现有 cookie。**只补缺失的名字**：`ttwid` 已有则不动（那是调用方
 * 的设备标识，铸造顺带产的那份与它会话无关），访客 id 已有任何拼写则原样返回。
 * @param cookie - 现有 cookie 串，可为空
 * @param minted - 铸造结果
 * @returns 合并后的 cookie 串；无可合并项时原样返回
 */
export const mergeVisitorCookie = (cookie: string | undefined, minted: DouyinMintedVisitor): string => {
  const base = cookie?.trim() ? cookie.trim().replace(/;\s*$/, '') : ''
  const names = new Set(
    base
      .split(';')
      .map((p) => p.split('=')[0].trim())
      .filter(Boolean)
  )
  if (names.has('UIFID_TEMP') || names.has('UIFID') || names.has('uifid') || names.has('uifid_temp')) return base

  const parts: string[] = []
  if (!names.has('ttwid') && minted.ttwid) parts.push(`ttwid=${minted.ttwid}`)
  if (minted.uifidTemp) parts.push(`UIFID_TEMP=${minted.uifidTemp}`)
  if (parts.length === 0) return base
  return base ? `${base}; ${parts.join('; ')}` : parts.join('; ')
}

/** 审计缓存：原始 cookie（+UA）→ 合并后 cookie。进程级，`UIFID_TEMP` 有效期约 500 天 */
const cache = new Map<string, string>()
/** in-flight 去重：并发调用共享同一次铸造（合并是按各自 cookie 进行的，结果正确） */
let inflight: Promise<string | undefined> | undefined

const CACHE_MAX_ENTRIES = 64

/**
 * cookie 审计：缺访客 id 时铸造并合并，其余原样返回。进程内缓存，同一 cookie 只铸一次。
 *
 * **永不为调用增加失败**：任何异常都吞掉并返回原 cookie，请求按原路径走——自愈失败
 * 的归因交给受保护端点自己的 `SIGNATURE_REFUSED`。
 * @param cookie - 本次调用的 cookie，可为空（全新部署连 cookie 都没配的场景）
 * @param userAgent - 本次调用的 UA（铸造请求用它，保证与后续 API 请求同源）
 * @param deps - 可注入的 HTTP 出口（测试用）
 * @returns 升级后的 cookie；无需升级或铸造失败时原样返回
 */
export const ensureDouyinVisitorCookie = async (
  cookie: string | undefined,
  userAgent?: string,
  deps?: MintDeps
): Promise<string | undefined> => {
  // 已有访客 id（六种拼写之一）→ 无需审计
  if (cookie && extractUifidFromCookie(cookie)) return cookie

  const cacheKey = `${cookie ?? ''} ${userAgent ?? ''}`
  const hit = cache.get(cacheKey)
  if (hit !== undefined) return hit

  if (inflight !== undefined) return inflight
  inflight = (async () => {
    try {
      const minted = await mintDouyinVisitorCookie(userAgent, deps)
      if (!minted) return cookie
      const merged = mergeVisitorCookie(cookie, minted)
      cache.set(cacheKey, merged)
      if (cache.size > CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) cache.delete(oldest)
      }
      return merged
    } catch {
      return cookie
    } finally {
      inflight = undefined
    }
  })()
  return inflight
}

/** 清空审计缓存（缓存是模块级的，测试与换凭证场景用） */
export const resetDouyinVisitorCookieCache = (): void => {
  cache.clear()
  inflight = undefined
}
