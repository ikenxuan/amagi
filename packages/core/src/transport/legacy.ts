import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, RawAxiosResponseHeaders } from 'axios'

import { createErrorResponse, ErrorResult } from '../validation'
import { emitLog, emitNetworkError, emitNetworkRetry } from '../model/events'

/**
 * v6 的低层网络入口（阶段 6 从 `model/networks.ts` 搬到这里）。
 *
 * v6 的 fetcher 层通过这组函数发请求；v7 的主路径全部走 `HttpClient`
 * （`transport/client.ts`）—— 校验/判定/信封由执行管线统一处理，不再
 * 经过这里。`fetchData` / `fetchResponse` / `isNetworkErrorResult` 是
 * 顶层保留导出（06-migration「保留且形状不变」），行为**逐字保持 v6**
 * （含 `validateStatus: () => true` 的 4xx 放行、仅认大写 `User-Agent`
 * 的清理等历史语义 —— 这些行为的修复只发生在 v7 主路径，本文件是
 * 兼容层的前身，v8 与 compat 一起移除）。
 *
 * @deprecated 新代码请用 `HttpClient` / client fetcher —— v7 的错误是
 *   `AmagiResult` 信封（`error.kind === 'network'`），不是这里返回的
 *   v6 `ErrorResult`。
 * @module transport/legacy
 */

/** 可恢复的错误代码列表 */
const RECOVERABLE_ERROR_CODES = [
  'ECONNRESET', // 连接被重置（代理切换、网络切换）
  'ETIMEDOUT', // 连接超时
  'ECONNREFUSED', // 连接被拒绝
  'ENOTFOUND', // DNS解析失败
  'ENETUNREACH', // 网络不可达
  'EHOSTUNREACH', // 主机不可达
  'EPIPE', // 管道破裂
  'EAI_AGAIN', // DNS临时失败
  'ECONNABORTED' // 连接中止
] as const

/** 默认最大重试次数 */
const DEFAULT_MAX_RETRIES = 3

/** 重试延迟基数（毫秒） */
const RETRY_DELAY_BASE = 1000

/**
 * 判断错误是否可恢复
 * @param error - Axios错误对象
 * @returns 是否可恢复
 */
const isRecoverableError = (error: AxiosError): boolean => {
  return RECOVERABLE_ERROR_CODES.includes(error.code as (typeof RECOVERABLE_ERROR_CODES)[number])
}

/**
 * 延迟函数
 * @param ms - 延迟毫秒数
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 创建网络错误响应
 * @param error - 错误对象
 * @param retries - 已重试次数
 * @returns 符合Result类型的错误响应
 */
const createNetworkErrorResult = (error: AxiosError, retries: number): ErrorResult => {
  const errorCode = error.code ?? 'UNKNOWN'
  const message = `网络请求失败 [${errorCode}]: ${error.message} (已重试 ${retries} 次)`

  return createErrorResponse(
    {
      code: 'UNKNOWN_ERROR',
      data: null,
      amagiError: {
        errorDescription: `${error.message} (已重试 ${retries} 次)`,
        requestType: error.config?.method?.toUpperCase() ?? 'UNKNOWN',
        requestUrl: error.config?.url ?? '',
        responseCode: errorCode
      },
      amagiMessage: error.message
    },
    message,
    500
  )
}

/**
 * 清理User-Agent中的Edge标识，确保请求兼容性
 * @param userAgent - 原始User-Agent字符串
 * @returns 清理后的User-Agent字符串
 */
const cleanUserAgent = (userAgent: string): string => {
  return userAgent.replace(/\s+Edg\/[\d.]+/g, '')
}

/**
 * 执行网络请求并返回数据（带自动重试）
 * @param config - axios请求配置
 * @param maxRetries - 最大重试次数，默认3次
 * @returns 响应数据或错误结果
 * @deprecated 用 client fetcher / `HttpClient`。返回的是 v6 `ErrorResult`，
 *   不是 `AmagiResult` 信封
 */
export const fetchData = async <T>(config: AxiosRequestConfig<T>, maxRetries: number = DEFAULT_MAX_RETRIES): Promise<T | ErrorResult> => {
  // 清理请求配置中的User-Agent
  const cleanedConfig = { ...config }
  if (cleanedConfig.headers && cleanedConfig.headers['User-Agent']) {
    cleanedConfig.headers['User-Agent'] = cleanUserAgent(cleanedConfig.headers['User-Agent'] as string)
  }

  let lastError: AxiosError | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios<T>({ ...cleanedConfig, validateStatus: () => true })
      return response.data
    } catch (error) {
      if (error instanceof AxiosError) {
        lastError = error

        if (isRecoverableError(error) && attempt < maxRetries) {
          const delayMs = RETRY_DELAY_BASE * Math.pow(2, attempt)
          emitNetworkRetry({
            errorCode: error.code ?? 'UNKNOWN',
            attempt: attempt + 1,
            maxRetries,
            delayMs,
            url: config.url
          })
          emitLog('warn', `网络请求失败 [${error.code}]，${delayMs}ms 后进行第 ${attempt + 1} 次重试...`)
          await delay(delayMs)
          continue
        }

        emitNetworkError({
          errorCode: error.code ?? 'UNKNOWN',
          message: error.message,
          retries: attempt,
          url: config.url
        })
        emitLog('error', '网络请求失败:', error.message)
        return createNetworkErrorResult(error, attempt)
      }
      throw error
    }
  }

  return createNetworkErrorResult(lastError!, maxRetries)
}

/**
 * 执行网络请求并返回完整响应（带自动重试）
 * @param config - axios请求配置
 * @param maxRetries - 最大重试次数，默认3次
 * @returns 完整响应或错误结果
 * @deprecated 用 client fetcher / `HttpClient`。返回的是 v6 `ErrorResult`，
 *   不是 `AmagiResult` 信封
 */
export const fetchResponse = async <T = unknown>(
  config: AxiosRequestConfig,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<AxiosResponse<T> | ErrorResult> => {
  // 清理请求配置中的User-Agent
  const cleanedConfig = { ...config }
  if (cleanedConfig.headers && cleanedConfig.headers['User-Agent']) {
    cleanedConfig.headers['User-Agent'] = cleanUserAgent(cleanedConfig.headers['User-Agent'] as string)
  }

  let lastError: AxiosError | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await axios<T>({ ...cleanedConfig, validateStatus: () => true })
    } catch (error) {
      if (error instanceof AxiosError) {
        lastError = error

        if (isRecoverableError(error) && attempt < maxRetries) {
          const delayMs = RETRY_DELAY_BASE * Math.pow(2, attempt)
          emitNetworkRetry({
            errorCode: error.code ?? 'UNKNOWN',
            attempt: attempt + 1,
            maxRetries,
            delayMs,
            url: config.url
          })
          emitLog('warn', `网络请求失败 [${error.code}]，${delayMs}ms 后进行第 ${attempt + 1} 次重试...`)
          await delay(delayMs)
          continue
        }

        emitNetworkError({
          errorCode: error.code ?? 'UNKNOWN',
          message: error.message,
          retries: attempt,
          url: config.url
        })
        emitLog('error', '网络请求失败:', error.message)
        return createNetworkErrorResult(error, attempt)
      }
      throw error
    }
  }

  return createNetworkErrorResult(lastError!, maxRetries)
}

/**
 * 判断结果是否为网络错误响应
 * @param result - 请求结果
 * @returns 是否为网络错误
 *
 * v6 语义逐字保留：`success: false` 且 `error.amagiError` 存在（本模块
 * 返回的 v6 `ErrorResult` 用这个判别）。同时识别 v7 的失败信封
 * （`error.kind === 'network'`）—— 同名 deprecated 转发（06-migration
 * 「保留但形状变化」），两代结果都能判。
 */
export const isNetworkErrorResult = (result: unknown): result is ErrorResult => {
  if (result === null || typeof result !== 'object') return false
  const obj = result as Record<string, unknown>
  const error = obj.error
  if (obj.success === false && error !== null && typeof error === 'object') {
    const err = error as Record<string, unknown>
    // v6：amagiError 字段存在；v7：kind === 'network'
    return 'amagiError' in err || err.kind === 'network'
  }
  return false
}

/**
 * 获取响应头和数据（带自动重试）。
 *
 * 06-migration「保留但形状变化」：不再从顶层导出，只在 transport 子路径
 * （本文件）保留 —— v6 里业务层直接用它取 headers，v7 的响应头走
 * `meta.trace` / `RawResponse`。
 * @param config - axios请求配置
 * @param maxRetries - 最大重试次数，默认3次
 * @returns 包含headers和data的对象，或错误结果
 * @deprecated 需要响应头时改用 v7 的 `meta.trace`（执行管线自动携带）
 */
export const getHeadersAndData = async <T = any>(
  config: AxiosRequestConfig,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<{ headers: RawAxiosResponseHeaders; data: T } | ErrorResult> => {
  const response = await fetchResponse<T>(config, maxRetries)

  // 检查是否为错误结果
  if ('success' in response && response.success === false) {
    return response
  }

  const normalizeHeaders = (headers: unknown): Record<string, string | string[]> => {
    if (headers && typeof (headers as { toJSON?: unknown }).toJSON === 'function') {
      return (headers as { toJSON(): Record<string, string | string[]> }).toJSON()
    }
    return (headers ?? {}) as Record<string, string | string[]>
  }

  return {
    headers: normalizeHeaders((response as AxiosResponse<T>).headers) as RawAxiosResponseHeaders,
    data: (response as AxiosResponse<T>).data
  }
}
