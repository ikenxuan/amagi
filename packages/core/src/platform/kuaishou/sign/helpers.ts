import crypto from 'node:crypto'

/**
 * 快手 `__NS_hxfalcon` 组包所需的标准化载荷。
 *
 * 这里的 `url` 已经是参与签名的规范路径，而不是最终请求 URL。
 */
export type KuaishouHxfalconPayload = {
  url: string
  query: Record<string, string>
  form: Record<string, string>
  requestBody: Record<string, unknown>
}

const SIGN_INPUT_SKIP_KEYWORD = '__NS'
const KUAISHOU_ANONYMOUS_KWW_KEY = 'K8wm5PvY9nX7qJc2'
const KUAISHOU_ANONYMOUS_KWW_SUFFIX = '###ssrd'
const KUAISHOU_ANONYMOUS_KWW_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

let kuaishouAnonymousKwwCache = ''

const compareLexicographically = (left: string, right: string): number => {
  if (left === right) return 0
  return left < right ? -1 : 1
}

const toComparableEntry = (key: string, value: unknown): string => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return `${key}=[object Object]`
  }

  return `${key}=${String(value)}`
}

const normalizePathname = (urlOrPath: string): string => {
  try {
    return new URL(urlOrPath).pathname
  } catch {
    return urlOrPath.split('?')[0] ?? urlOrPath
  }
}

const sortSearchParams = (searchParams: URLSearchParams): Record<string, string> => {
  return [...searchParams.entries()]
    .sort(([leftKey], [rightKey]) => compareLexicographically(leftKey, rightKey))
    .reduce<Record<string, string>>((result, [key, value]) => {
      result[key] = value
      return result
    }, {})
}

/**
 * 解析快手签名所使用的规范路径。
 *
 * 快手部分 `live_api` 接口的公开 URL 与算法内部参与签名的路径并不一致，
 * 因此这里优先使用调用方显式传入的 `signPath`，否则回退到 URL 自身的 pathname。
 *
 * @param urlOrPath - 原始 URL 或路径
 * @param signPath - 调用方声明的规范签名路径
 * @returns 参与签名的规范 pathname
 */
export const resolveKuaishouHxfalconSignPath = (
  urlOrPath: string,
  signPath?: string
): string => {
  const pathname = normalizePathname(signPath ?? urlOrPath)

  if (!pathname.startsWith('/')) {
    throw new Error(`Invalid Kuaishou signing path: ${pathname}`)
  }

  return pathname
}

/**
 * 从请求 URL 构造快手签名载荷。
 *
 * @param url - 实际请求 URL
 * @param signPath - 可选的规范签名路径
 * @returns 供纯算法签名链路使用的结构化载荷
 */
export const buildKuaishouHxfalconPayload = (
  url: string,
  signPath?: string
): KuaishouHxfalconPayload => {
  const parsedUrl = new URL(url)
  const realPath = resolveKuaishouHxfalconSignPath(parsedUrl.pathname, signPath)

  const query = sortSearchParams(parsedUrl.searchParams)

  if (!query.caver) {
    throw new Error(`Missing caver query parameter for Kuaishou signing: ${url}`)
  }

  return {
    url: realPath,
    query,
    form: {},
    requestBody: {}
  }
}

/**
 * 构造快手 `__NS_hxfalcon` 的 sign input。
 *
 * 该字符串就是后续 `HUDR_` / `$HE_` 两段算法共同依赖的输入材料。
 *
 * @param payload - 已标准化的签名载荷
 * @returns 按快手页面规则拼接后的 sign input
 */
export const buildKuaishouHxfalconSignInput = (payload: KuaishouHxfalconPayload): string => {
  const combinedParams = { ...payload.query, ...payload.form }
  const serializedParams = Object.keys(combinedParams)
    .filter((key) => !key.includes(SIGN_INPUT_SKIP_KEYWORD))
    .map((key) => toComparableEntry(key, combinedParams[key]))
    .sort(compareLexicographically)
    .join('')

  const requestBody = Object.keys(payload.requestBody).length > 0
    ? JSON.stringify(payload.requestBody)
    : ''

  return `${normalizePathname(payload.url)}${serializedParams}${requestBody}`
}

/**
 * 从 Cookie 字符串中提取指定键值。
 *
 * @param cookie - 原始 Cookie 字符串
 * @param key - 目标键名
 * @returns 命中的 Cookie 值；未命中时返回空字符串
 */
export const extractCookieValue = (cookie: string | undefined, key: string): string => {
  if (!cookie?.trim()) return ''

  const pattern = new RegExp(`(?:^|;\\s*)${key}=([^;]*)`)
  const match = cookie.match(pattern)

  return match?.[1] ?? ''
}

const generateKuaishouAnonymousKwwSeed = (): string => {
  let randomPart = ''

  for (let index = 0; index < 8; index++) {
    const randomIndex = Math.floor(Math.random() * KUAISHOU_ANONYMOUS_KWW_ALPHABET.length)
    randomPart += KUAISHOU_ANONYMOUS_KWW_ALPHABET[randomIndex]
  }

  return `${Date.now()}|${randomPart}`
}

const encryptKuaishouAnonymousKwwSeed = (seed: string): string => {
  const key = Buffer.from(KUAISHOU_ANONYMOUS_KWW_KEY, 'utf8')
  const cipher = crypto.createCipheriv('aes-128-cbc', key, key)

  return Buffer.concat([
    cipher.update(seed, 'utf8'),
    cipher.final()
  ]).toString('base64')
}

/**
 * 生成匿名访问快手 `live_api` 时所需的 `kww`。
 *
 * 页面未持有 `kwfv1` 时，会退回到一段本地 AES 生成值。
 * 这里将其缓存到当前进程，模拟浏览器侧“同一访客会话复用同一份访客标识”的行为。
 *
 * @returns 可用于匿名请求的 `kww`
 */
export const deriveKuaishouAnonymousKww = (): string => {
  if (!kuaishouAnonymousKwwCache) {
    kuaishouAnonymousKwwCache = `${encryptKuaishouAnonymousKwwSeed(generateKuaishouAnonymousKwwSeed())}${KUAISHOU_ANONYMOUS_KWW_SUFFIX}`
  }

  return kuaishouAnonymousKwwCache
}

/**
 * 解析快手 `kww` 请求头。
 *
 * 当前页面存在两条路径：
 * 1. 若已有 `kwfv1`，则 `kww` 直接复用该值
 * 2. 若还没有访客 Cookie，则退回到页面本地生成的匿名 `kww`
 *
 * @param cookie - 原始 Cookie 字符串
 * @returns 可用于请求头的 `kww` 值
 */
export const deriveKuaishouKww = (cookie?: string): string => {
  const kwfv1 = extractCookieValue(cookie, 'kwfv1')

  if (kwfv1) {
    return kwfv1
  }

  return deriveKuaishouAnonymousKww()
}
