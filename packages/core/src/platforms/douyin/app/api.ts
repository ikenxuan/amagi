import type { RequestSpec } from '../../../contracts/request'

/** 仅拼业务参数；App 会话在送签前补全设备、版本和时间戳。 */
export const appRequest = (
  path: string,
  params: Record<string, string | number | undefined> = {},
  guestCookie = false,
  host = 'https://aweme.snssdk.com'
): RequestSpec => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value))
  return { method: 'GET', url: host + path + (query.size ? '?' + query.toString() : ''), extra: { guestCookie } }
}

/** 相邻页可能重复记录；只按实际存在的业务 ID 去重，缺 ID 的记录保留。 */
export const uniqueAppItems = <T>(items: T[], key: string): T[] => [
  ...new Map(
    items.map((item) => {
      const id = item && typeof item === 'object' ? (item as Record<string, unknown>)[key] : undefined
      return [id ?? item, item] as const
    })
  ).values()
]
