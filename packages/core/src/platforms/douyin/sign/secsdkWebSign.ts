/**
 * 抖音主站 `x-secsdk-web-signature` 纯算实现（TypeScript 移植）
 *
 * 移植自 cv-cat/DouYin_Spider `utils/secsdk_web_sign.py`，算法与常量按该实现逐条对齐。
 *
 * ## 算法
 *
 * ```text
 * plain     = {uifid}_{timestamp}_{WEBSIGN_CONST}_{canonical_query}
 * signature = md5(plain) 的 32 位小写十六进制
 * ```
 *
 * `WEBSIGN_CONST` 是 secsdk VMP 常量池里的写死盐，与账号 / 会话无关。
 *
 * ## canonical_query 规范化规则
 *
 * - 保持原始参数顺序，**不排序**；重复参数原样保留。
 * - 每个 value 先解码（`+`→空格、`%XX`→字节）再用 `encodeURIComponent` 重编码。
 * - key **只解码、不重编码**。
 * - 无等号的裸参数补成 `k=`。
 * - `&timestamp={ts}` 追加到 query 末尾后再参与哈希。
 * - query 里没有 `uifid` 时，从 `UIFID` cookie 取值追加到末尾再签。
 *
 * ## 重要
 *
 * 签名算的是**规范化后的 query**，服务端也按收到的 query 校验，所以必须发送
 * {@link signSecsdkWebUrl} 返回的 URL，不能拿原始 URL 直接发。
 *
 * 签名绑 query、**不绑 path**（本项目实测：同一份 query 换 path 仍然 200）。
 *
 * @module platform/douyin/secsdkWebSign
 */

import { getCookieValue } from '../../../contracts/cookie'
import { md5Hex } from '../../../utils/md5'

/** secsdk VM 常量池里的固定盐（与账号 / 会话无关） */
export const WEBSIGN_CONST = 'A96D855A08C0A9707F8BEF0D9A527E4E'

/** 签名参数名 */
export const SECSDK_SIG_KEY = 'x-secsdk-web-signature'

/** 时间戳参数名 */
export const SECSDK_TS_KEY = 'timestamp'

/** 走 secsdk 签名的 GET 接口路径（来自 SDK 的 webSign 策略配置） */
export const PROTECTED_PATHS_GET: readonly string[] = [
  '/aweme/v1/web/aweme/detail/',
  '/aweme/v1/web/aweme/post/',
  '/aweme/v1/web/aweme/favorite/',
  '/aweme/v1/web/aweme/listcollection/',
  '/aweme/v1/web/mix/aweme/',
  '/aweme/v1/web/tab/feed/',
  '/aweme/v1/web/mix/list/',
  '/aweme/v1/web/music/aweme/',
  '/aweme/v1/web/music/list/',
  '/aweme/v1/web/mix/detail/',
  '/aweme/v1/web/mix/listcollection/',
  '/aweme/v1/web/music/detail/',
  '/aweme/v1/web/collects/list/',
  '/aweme/v1/web/collects/video/list/'
]

/** 走 secsdk 签名的 POST 接口路径 */
export const PROTECTED_PATHS_POST: readonly string[] = [
  '/aweme/v1/web/aweme/detail/',
  '/aweme/v1/web/aweme/post/',
  '/aweme/v1/web/aweme/favorite/',
  '/aweme/v1/web/aweme/listcollection/',
  '/aweme/v1/web/mix/aweme/',
  '/aweme/v1/web/tab/feed/'
]

/** {@link signSecsdkWebQuery} 的返回值 */
export interface SecsdkSignResult {
  /** 参与签名的 10 位秒级时间戳 */
  ts: number
  /** 32 位小写十六进制签名 */
  signature: string
  /** **实际应当发送**的规范化 query（含 timestamp，不含签名字段） */
  signedQuery: string
}

/** 签名入参 */
export interface SecsdkSignOptions {
  /** 10 位秒级时间戳，缺省取当前时间 */
  ts?: number
  /** query 里没有 uifid 时的兜底值（对应 `UIFID` cookie） */
  uifid?: string
}

const HEX_PAIR = /^[0-9A-Fa-f]{2}$/

/**
 * 宽容的百分号解码，等价于 Python `urllib.parse.unquote(..., errors='replace')`：
 * 合法的 `%XX` 解成字节，非法的 `%` 原样保留，最后按 UTF-8 解码（坏字节 → U+FFFD）。
 *
 * 不能直接用 `decodeURIComponent` —— 它遇到 `100%` 这种孤立百分号会抛异常，
 * 而 SDK 的行为是把它当字面量留下（`100%` → 签成 `100%25`）。
 *
 * @param input - 待解码字符串
 * @returns 解码后的字符串
 */
const percentDecodeLoose = (input: string): string => {
  if (!input.includes('%')) return input
  const bytes: number[] = []
  let i = 0
  while (i < input.length) {
    if (input[i] === '%' && HEX_PAIR.test(input.slice(i + 1, i + 3))) {
      bytes.push(parseInt(input.slice(i + 1, i + 3), 16))
      i += 3
      continue
    }
    for (const byte of new TextEncoder().encode(input[i])) bytes.push(byte)
    i += 1
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

/**
 * 等价于 Python `unquote_plus`：先把 `+` 当空格，再做百分号解码。
 *
 * @param input - 待解码字符串
 * @returns 解码后的字符串
 */
const unquotePlusLoose = (input: string): string => percentDecodeLoose(input.includes('+') ? input.replace(/\+/g, ' ') : input)

/**
 * 按 SDK 规则规范化 query 字符串：顺序不变，value 解码后用 `encodeURIComponent` 重编码，
 * key 只解码不重编码，无等号的裸参数补成 `k=`。
 *
 * @param query - 原始 query 字符串（不含 `?`）
 * @returns 规范化后的 query 字符串
 */
export const canonicalQuery = (query: string): string => {
  const parts: string[] = []
  for (const pair of query.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const rawKey = eq === -1 ? pair : pair.slice(0, eq)
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1)
    parts.push(`${unquotePlusLoose(rawKey)}=${encodeURIComponent(unquotePlusLoose(rawValue))}`)
  }
  return parts.join('&')
}

/**
 * 拆成 `[base, query]`，并剥掉已有的 `timestamp` / 签名字段，保证可重复调用。
 *
 * @param url - 完整 URL
 * @returns `[base, query]` 二元组
 */
const splitUrl = (url: string): [string, string] => {
  const mark = url.indexOf('?')
  if (mark === -1) return [url, '']
  const base = url.slice(0, mark)
  const kept = url
    .slice(mark + 1)
    .split('&')
    .filter((pair) => {
      if (!pair) return false
      const name = pair.split('=', 1)[0]
      return name !== SECSDK_TS_KEY && name !== SECSDK_SIG_KEY
    })
  return [base, kept.join('&')]
}

/**
 * secsdk 找访客 id 时认的 cookie 名，**按此顺序取第一个非空值**。
 *
 * 抖音自己铸造访客身份时落的是 `UIFID_TEMP`，`UIFID` 是同一个值的另一种拼写；
 * SDK 六种都认。只认 `UIFID=` 一种会漏掉只有 `UIFID_TEMP` 的 cookie —— 那种 cookie
 * 明明带着可用的访客 id，却被判成「没有」，于是整条 secsdk 加签被跳过。
 *
 * 清单为线上实测的 SDK 查找顺序。
 */
export const UIFID_COOKIE_NAMES: readonly string[] = ['uifid', 'uifid_temp', 'uifidtemp', 'UIFID', 'UIFID_TEMP', 'UIFIDTEMP']

/**
 * 从 cookie 字符串里取访客 id。
 *
 * 按 {@link UIFID_COOKIE_NAMES} 的顺序取第一个非空值。用 `getCookieValue` 按名精确
 * 匹配，所以 `UIFID_TEMP=temp; UIFID=real` 不会把 `UIFID` 读成 `temp`
 * （cookie 名大小写敏感，`getCookieValue` 也不做归一化）。
 *
 * @param cookie - cookie 字符串
 * @returns 访客 id，取不到时返回空串
 */
export const extractUifidFromCookie = (cookie?: string | null): string => {
  if (!cookie) return ''
  for (const name of UIFID_COOKIE_NAMES) {
    const value = getCookieValue(cookie, name)?.trim()
    if (value) return value
  }
  return ''
}

/**
 * 判断该 path 是否需要 secsdk 加签（依据 SDK 的 webSign 策略配置）。
 *
 * @param path - URL 的 pathname
 * @param method - HTTP 方法，默认 `GET`
 * @returns 是否需要加签
 */
export const isSecsdkProtected = (path: string, method = 'GET'): boolean => {
  const table = String(method).toUpperCase() === 'POST' ? PROTECTED_PATHS_POST : PROTECTED_PATHS_GET
  return table.includes(path)
}

/**
 * 计算 `x-secsdk-web-signature`。
 *
 * @param url - 完整 API URL（scheme+host+path+query）。已带 `timestamp` /
 *              `x-secsdk-web-signature` 时会自动剥除，可重复调用。
 * @param options - 时间戳与 uifid 兜底值
 * @returns 时间戳、签名与**实际应当发送**的规范化 query
 */
export const signSecsdkWebQuery = (url: string, options: SecsdkSignOptions = {}): SecsdkSignResult => {
  const ts = Math.trunc(options.ts ?? Date.now() / 1000)
  const [, rawQuery] = splitUrl(url)
  let canon = canonicalQuery(rawQuery)

  /* query 里没有 uifid 时，SDK 会从 UIFID cookie 取值追加到末尾再签 */
  const names = canon
    .split('&')
    .filter(Boolean)
    .map((pair) => pair.split('=', 1)[0])
  if (!names.includes('uifid') && options.uifid) {
    const appended = `uifid=${encodeURIComponent(options.uifid)}`
    canon = canon ? `${canon}&${appended}` : appended
  }

  const signedQuery = canon ? `${canon}&${SECSDK_TS_KEY}=${ts}` : `${SECSDK_TS_KEY}=${ts}`

  /* 取参与拼明文的 uifid（解码后的原值） */
  let uifidValue = ''
  for (const pair of signedQuery.split('&')) {
    if (pair.startsWith('uifid=')) {
      uifidValue = unquotePlusLoose(pair.slice('uifid='.length))
      break
    }
  }
  if (!uifidValue && options.uifid) uifidValue = options.uifid

  const plain = `${uifidValue}_${ts}_${WEBSIGN_CONST}_${signedQuery}`
  const signature = md5Hex(plain)
  return { ts, signature, signedQuery }
}

/**
 * 返回可直接发送的完整 URL（规范化 query + timestamp + 签名）。
 *
 * 服务端按收到的 query 校验签名，所以必须发这个返回值，不能拿原始 URL 直接发。
 *
 * @param url - 完整 API URL
 * @param options - 时间戳与 uifid 兜底值
 * @returns 带签名的完整 URL
 */
export const signSecsdkWebUrl = (url: string, options: SecsdkSignOptions = {}): string => {
  const [base] = splitUrl(url)
  const { signature, signedQuery } = signSecsdkWebQuery(url, options)
  return `${base}?${signedQuery}&${SECSDK_SIG_KEY}=${signature}`
}

/** {@link applySecsdkWebSign} 的入参 */
export interface ApplySecsdkOptions extends SecsdkSignOptions {
  /** 请求 cookie，用于在 `uifid` 缺省时取访客 id（见 {@link UIFID_COOKIE_NAMES}） */
  cookie?: string | null
  /** HTTP 方法，默认 `GET` */
  method?: string
}

/**
 * 对受保护接口补上 secsdk 签名；path 不在策略表里时原样返回。
 *
 * 这是给取数层用的唯一入口 —— 无条件套在 URL 上即可，不需要调用方判断端点。
 *
 * ## 取不到访客 id 时**整个不加签**
 *
 * 取不到就拿空串继续算的话，受保护端点会收到一个「签了名、但签的是一个不存在的
 * 访客」的请求，抖音回 `403 Uifid Not Found` —— 且会被判成风控，**一个签名缺参的
 * 问题看起来像账号被风控**。不加签则表外端点照常工作，表内端点由平台自己点名
 * `uifid`，比自造错误有信息量。与 `webid` 的纪律同源：不传安全，传错致命。
 *
 * 访客 id **算不出来**：它由 secsdk 在真实浏览器里向铸造接口申请，所以这里只能
 * 取、不能造。扫码登录拿回来的是身份 cookie（`sessionid` 那一族），不含访客 id，
 * 这是「刚登录完反而被拦」的成因。
 *
 * @param url - 完整 API URL（应当是**最后一步**，即 a_bogus 等参数都已拼好之后）
 * @param options - cookie / uifid / method / ts
 * @returns 需要加签且拿到访客 id 的返回带签名的 URL，否则原样返回
 */
export const applySecsdkWebSign = (url: string, options: ApplySecsdkOptions = {}): string => {
  let pathname: string
  try {
    pathname = new URL(url).pathname
  } catch {
    return url
  }
  if (!isSecsdkProtected(pathname, options.method)) return url
  const uifid = options.uifid || extractUifidFromCookie(options.cookie)
  // 签一个不存在的访客只会换来 403 + `Uifid Not Found`，见上
  if (!uifid) return url
  return signSecsdkWebUrl(url, { ts: options.ts, uifid })
}
