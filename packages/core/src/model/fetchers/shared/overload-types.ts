/**
 * Fetcher 函数重载类型工具
 * 用于自动生成带 typeMode 的函数重载签名
 */

import type { RequestConfig } from '../../../server'
import type { Result } from '../../../validation'
import type { TypeMode } from '../types'

/**
 * 提取选项类型中的 typeMode 字段
 */
type ExtractTypeMode<T> = T extends { typeMode?: infer M } ? M : never

/**
 * 为单个方法生成函数重载类型
 * @template TOptions - 方法的选项参数类型
 * @template TStrictReturn - typeMode='strict' 时的返回类型
 * @template TCookie - Cookie 参数类型（可选）
 * @template TRequestConfig - 请求配置参数类型（可选）
 */
export type MethodOverload<
  TOptions,
  TStrictReturn,
  TCookie extends string | undefined = string | undefined,
  TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined
> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (
    options: TOptions & { typeMode: 'strict' },
    ...args: TCookie extends undefined
      ? TRequestConfig extends undefined
        ? []
        : [requestConfig?: TRequestConfig]
      : TRequestConfig extends undefined
        ? [cookie?: TCookie]
        : [cookie?: TCookie, requestConfig?: TRequestConfig]
  ): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (
    options: TOptions,
    ...args: TCookie extends undefined
      ? TRequestConfig extends undefined
        ? []
        : [requestConfig?: TRequestConfig]
      : TRequestConfig extends undefined
        ? [cookie?: TCookie]
        : [cookie?: TCookie, requestConfig?: TRequestConfig]
  ): Promise<Result<any>>
}

/**
 * 为绑定 Cookie 的方法生成函数重载类型（少了 cookie 参数）
 */
export type BoundMethodOverload<
  TOptions,
  TStrictReturn,
  TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined
> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (
    options: TOptions & { typeMode: 'strict' },
    requestConfig?: TRequestConfig
  ): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (
    options: TOptions,
    requestConfig?: TRequestConfig
  ): Promise<Result<any>>
}

/**
 * 为无参数方法生成函数重载类型
 */
export type NoParamMethodOverload<
  TStrictReturn,
  TCookie extends string | undefined = string | undefined,
  TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined
> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (
    options: { typeMode: 'strict' },
    ...args: TCookie extends undefined
      ? TRequestConfig extends undefined
        ? []
        : [requestConfig?: TRequestConfig]
      : TRequestConfig extends undefined
        ? [cookie?: TCookie]
        : [cookie?: TCookie, requestConfig?: TRequestConfig]
  ): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (
    options?: { typeMode?: TypeMode },
    ...args: TCookie extends undefined
      ? TRequestConfig extends undefined
        ? []
        : [requestConfig?: TRequestConfig]
      : TRequestConfig extends undefined
        ? [cookie?: TCookie]
        : [cookie?: TCookie, requestConfig?: TRequestConfig]
  ): Promise<Result<any>>
}

/**
 * 为绑定 Cookie 的无参数方法生成函数重载类型
 */
export type BoundNoParamMethodOverload<
  TStrictReturn,
  TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined
> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (
    options: { typeMode: 'strict' },
    requestConfig?: TRequestConfig
  ): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (
    options?: { typeMode?: TypeMode },
    requestConfig?: TRequestConfig
  ): Promise<Result<any>>
}

/**
 * 为带可选参数的方法生成函数重载类型（参数可选但可能包含额外字段）
 */
export type OptionalParamMethodOverload<
  TOptions,
  TStrictReturn,
  TCookie extends string | undefined = string | undefined,
  TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined
> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (
    options: TOptions & { typeMode: 'strict' },
    ...args: TCookie extends undefined
      ? TRequestConfig extends undefined
        ? []
        : [requestConfig?: TRequestConfig]
      : TRequestConfig extends undefined
        ? [cookie?: TCookie]
        : [cookie?: TCookie, requestConfig?: TRequestConfig]
  ): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (
    options?: TOptions,
    ...args: TCookie extends undefined
      ? TRequestConfig extends undefined
        ? []
        : [requestConfig?: TRequestConfig]
      : TRequestConfig extends undefined
        ? [cookie?: TCookie]
        : [cookie?: TCookie, requestConfig?: TRequestConfig]
  ): Promise<Result<any>>
}

/**
 * 为绑定 Cookie 的带可选参数方法生成函数重载类型
 */
export type BoundOptionalParamMethodOverload<
  TOptions,
  TStrictReturn,
  TRequestConfig extends RequestConfig | undefined = RequestConfig | undefined
> = {
  // 重载 1: typeMode='strict' 时返回精确类型
  (
    options: TOptions & { typeMode: 'strict' },
    requestConfig?: TRequestConfig
  ): Promise<Result<TStrictReturn>>

  // 重载 2: 默认情况返回 any
  (
    options?: TOptions,
    requestConfig?: TRequestConfig
  ): Promise<Result<any>>
}
