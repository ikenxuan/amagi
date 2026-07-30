import type { RequestConfig } from '../../../server'

type RequestHeaders = NonNullable<RequestConfig['headers']>

/**
 * 未显式覆盖 Cookie 的单次请求配置。
 *
 * Cookie 请求头必须使用大写 `Cookie`。小写 `cookie` 会被类型系统拒绝，
 * 避免 Axios 请求头与平台签名逻辑读取到不同字段。
 */
export type FetcherRequestConfigWithoutCookie = Omit<RequestConfig, 'headers'> & {
  headers?: RequestHeaders & {
    Cookie?: never
    cookie?: never
  }
}

/**
 * 显式覆盖 Cookie 的单次请求配置。
 *
 * 裸 Fetcher 会把 `Cookie` 的字符串字面量与 cookie 参数关联起来：
 * 两处必须传入相同的值。
 */
export type FetcherRequestConfigWithCookie<TCookie extends string> = Omit<RequestConfig, 'headers'> & {
  headers: RequestHeaders & {
    Cookie: TCookie
    cookie?: never
  }
}

/** 裸 Fetcher 匿名请求使用的严格配置。 */
export type AnonymousFetcherRequestConfig = FetcherRequestConfigWithCookie<''>

/**
 * 根据裸 Fetcher 的单次请求配置推导 cookie 参数类型。
 *
 * - 大写 `Cookie`：cookie 参数必须与请求头字符串字面量一致。
 * - 小写 `cookie`：返回 `never`，拒绝大小写错误。
 * - 未显式声明 Cookie：保持原有的可选字符串参数。
 */
export type FetcherCookieForRequestConfig<TRequestConfig extends RequestConfig> = TRequestConfig extends {
  headers: infer THeaders
}
  ? THeaders extends { cookie: unknown }
    ? never
    : THeaders extends { Cookie: infer TCookie }
      ? TCookie extends string
        ? TCookie
        : never
      : string | undefined
  : string | undefined
