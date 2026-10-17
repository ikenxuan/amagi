import { getCookieValue, parseCookie, serializeCookie } from '../../contracts/cookie'

export type UifidSource = 'UIFID' | 'UIFID_TEMP' | 'missing'

export interface NormalizedDouyinCookie {
  cookie: string
  uifidSource: UifidSource
}

/** 只剥掉成对的导出引号包裹；cookie 值本身从不做 URL 解码。 */
const unquote = (value: string): string => {
  let result = value
  while (result.length >= 2 && (result[0] === '"' || result[0] === "'") && result.at(-1) === result[0]) {
    result = result.slice(1, -1)
  }
  return result
}

/** 修复粘贴进来的 cookie 文本，解析与序列化仍交给共享的 contract。 */
export const normalizeDouyinCookie = (raw?: string | null): NormalizedDouyinCookie => {
  const text = raw?.trim() ?? ''
  if (!text) return { cookie: '', uifidSource: 'missing' }
  const jar = parseCookie(text.replace(/[\r\n]+/g, '; '))
  let changed = /[\r\n]|\s=|=\s/.test(text)
  for (const name of Object.keys(jar)) {
    const value = unquote(jar[name])
    changed ||= value !== jar[name]
    jar[name] = value
  }
  let uifidSource: UifidSource = jar.UIFID ? 'UIFID' : 'missing'
  if (!jar.UIFID && jar.UIFID_TEMP) {
    jar.UIFID = jar.UIFID_TEMP
    changed = true
    uifidSource = 'UIFID_TEMP'
  }
  return { cookie: changed ? serializeCookie(jar) : text, uifidSource }
}

/**
 * secsdk 找访客 id 时认的 cookie 名，**按此顺序取第一个非空值**（线上实测的 SDK 查找顺序）。
 *
 * 抖音自己铸造访客身份时落的是 `UIFID_TEMP`；`normalizeDouyinCookie` 已把它补成 `UIFID`，
 * 其余拼写不改写 cookie，只在取签名用的值时认。
 */
export const UIFID_COOKIE_NAMES: readonly string[] = ['uifid', 'uifid_temp', 'uifidtemp', 'UIFID', 'UIFID_TEMP', 'UIFIDTEMP']

/**
 * 只取真实的设备标识；缺失时绝不在本地生成。
 *
 * 先归一化再按 {@link UIFID_COOKIE_NAMES} 精确匹配（`getCookieValue` 先解析成键值对，
 * `UIFID_TEMP=temp; UIFID=real` 不会把 `UIFID` 读成 `temp`）。
 * @param cookie - cookie 字符串
 * @returns 访客 id，取不到时返回空串
 */
export const extractUifidFromCookie = (cookie?: string | null): string => {
  const normalized = normalizeDouyinCookie(cookie).cookie
  if (!normalized) return ''
  for (const name of UIFID_COOKIE_NAMES) {
    const value = getCookieValue(normalized, name)?.trim()
    if (value) return value
  }
  return ''
}
