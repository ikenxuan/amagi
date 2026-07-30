import type { RequestConfig } from '../../../server'

/**
 * 合并 Fetcher 的实例级请求配置与单次请求配置。
 *
 * 单次配置优先，请求头单独合并。函数不会修改任一入参，因此同一绑定
 * Fetcher 可以安全地在并发任务中为不同请求使用不同配置。
 */
export const mergeRequestConfig = (base?: RequestConfig, override?: RequestConfig): RequestConfig | undefined => {
  if (!override) return base

  return {
    ...(base ?? {}),
    ...override,
    headers: {
      ...(base?.headers ?? {}),
      ...(override.headers ?? {})
    }
  }
}

/**
 * 解析绑定 Fetcher 当前调用实际使用的 cookie 与请求配置。
 *
 * 实例级或单次配置显式提供大写 `headers.Cookie` 时，合并后的值同时替换
 * 底层 Fetcher 的 cookie 参数，确保平台签名、前置请求和最终请求处于同一身份状态。
 */
export const resolveBoundRequest = (
  boundCookie: string,
  base?: RequestConfig,
  override?: RequestConfig
): [cookie: string, requestConfig: RequestConfig | undefined] => {
  const requestConfig = mergeRequestConfig(base, override)
  const headers = requestConfig?.headers
  const hasCookieHeader = Boolean(headers && Object.prototype.hasOwnProperty.call(headers, 'Cookie'))
  const cookieOverride = hasCookieHeader ? (headers as Record<string, unknown>).Cookie : undefined

  return [typeof cookieOverride === 'string' ? cookieOverride : boundCookie, requestConfig]
}
