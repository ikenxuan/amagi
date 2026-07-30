/**
 * Fetcher 函数重载类型工具
 * 用于自动生成带 typeMode 的函数重载签名
 */

import type { RequestConfig } from '../../../server'
import type { Result } from '../../../validation'
import type { TypeMode } from '../types'
import type { FetcherCookieForRequestConfig } from './request-types'

/**
 * 为单个方法生成函数重载类型
 * @template TOptions - 方法的选项参数类型
 * @template TStrictReturn - typeMode='strict' 时的返回类型
 */
export type MethodOverload<TOptions, TStrictReturn> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (options: TOptions & { typeMode: 'strict' }, cookie?: string): Promise<Result<TStrictReturn>>

  // 重载 2: 参数二由参数三中显式声明的大写 Cookie 请求头决定
  <const TRequestConfig extends RequestConfig>(
    options: TOptions & { typeMode: 'strict' },
    cookie: NoInfer<FetcherCookieForRequestConfig<TRequestConfig>>,
    requestConfig: TRequestConfig
  ): Promise<Result<TStrictReturn>>

  // 重载 3: 默认情况返回 any
  (options: TOptions, cookie?: string): Promise<Result<any>>

  // 重载 4: 宽松模式下同样由参数三推导 cookie 参数
  <const TRequestConfig extends RequestConfig>(
    options: TOptions,
    cookie: NoInfer<FetcherCookieForRequestConfig<TRequestConfig>>,
    requestConfig: TRequestConfig
  ): Promise<Result<any>>
}

/**
 * 为绑定 Cookie 的方法生成函数重载类型（少了 cookie 参数）
 *
 * 第二个参数用于覆盖当前调用的请求配置。绑定 Fetcher 的实现会将它与
 * 实例级配置合并，不会修改实例本身。
 */
export type BoundMethodOverload<TOptions, TStrictReturn, TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (options: TOptions & { typeMode: 'strict' }, requestConfig?: TRequestConfig): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (options: TOptions, requestConfig?: TRequestConfig): Promise<Result<any>>
}

/**
 * 为无参数方法生成函数重载类型
 */
export type NoParamMethodOverload<TStrictReturn> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (options: { typeMode: 'strict' }, cookie?: string): Promise<Result<TStrictReturn>>

  // 重载 2: 参数二由参数三中显式声明的大写 Cookie 请求头决定
  <const TRequestConfig extends RequestConfig>(
    options: { typeMode: 'strict' },
    cookie: NoInfer<FetcherCookieForRequestConfig<TRequestConfig>>,
    requestConfig: TRequestConfig
  ): Promise<Result<TStrictReturn>>

  // 重载 3: 默认情况返回 any
  (options?: { typeMode?: TypeMode }, cookie?: string): Promise<Result<any>>

  // 重载 4: 宽松模式下同样由参数三推导 cookie 参数
  <const TRequestConfig extends RequestConfig>(
    options: { typeMode?: TypeMode } | undefined,
    cookie: NoInfer<FetcherCookieForRequestConfig<TRequestConfig>>,
    requestConfig: TRequestConfig
  ): Promise<Result<any>>
}

/**
 * 为绑定 Cookie 的无参数方法生成函数重载类型
 *
 * `requestConfig` 只影响当前调用，并由绑定 Fetcher 与实例级配置合并。
 */
export type BoundNoParamMethodOverload<TStrictReturn, TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (options: { typeMode: 'strict' }, requestConfig?: TRequestConfig): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (options?: { typeMode?: TypeMode }, requestConfig?: TRequestConfig): Promise<Result<any>>
}

/**
 * 为带可选参数的方法生成函数重载类型（参数可选但可能包含额外字段）
 */
export type OptionalParamMethodOverload<TOptions, TStrictReturn> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (options: TOptions & { typeMode: 'strict' }, cookie?: string): Promise<Result<TStrictReturn>>

  // 重载 2: 参数二由参数三中显式声明的大写 Cookie 请求头决定
  <const TRequestConfig extends RequestConfig>(
    options: TOptions & { typeMode: 'strict' },
    cookie: NoInfer<FetcherCookieForRequestConfig<TRequestConfig>>,
    requestConfig: TRequestConfig
  ): Promise<Result<TStrictReturn>>

  // 重载 3: 默认情况返回 any
  (options?: TOptions, cookie?: string): Promise<Result<any>>

  // 重载 4: 宽松模式下同样由参数三推导 cookie 参数
  <const TRequestConfig extends RequestConfig>(
    options: TOptions | undefined,
    cookie: NoInfer<FetcherCookieForRequestConfig<TRequestConfig>>,
    requestConfig: TRequestConfig
  ): Promise<Result<any>>
}

/**
 * 为绑定 Cookie 的带可选参数方法生成函数重载类型
 *
 * `requestConfig` 只影响当前调用，并由绑定 Fetcher 与实例级配置合并。
 */
export type BoundOptionalParamMethodOverload<
  TOptions,
  TStrictReturn,
  TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined
> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (options: TOptions & { typeMode: 'strict' }, requestConfig?: TRequestConfig): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (options?: TOptions, requestConfig?: TRequestConfig): Promise<Result<any>>
}
