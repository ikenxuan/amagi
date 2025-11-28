import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, RawAxiosResponseHeaders } from 'axios'

import { amagiAPIErrorCode } from '../types/NetworksConfigType'
import { createErrorResponse, ErrorResult } from '../validation'
import { logger } from './logger'

/** 可恢复的错误代码列表 */
const RECOVERABLE_ERROR_CODES = [
  'ECONNRESET',    // 连接被重置（代理切换、网络切换）
  'ETIMEDOUT',     // 连接超时
  'ECONNREFUSED',  // 连接被拒绝
  'ENOTFOUND',     // DNS解析失败
  'ENETUNREACH',   // 网络不可达
  'EHOSTUNREACH',  // 主机不可达
  'EPIPE',         // 管道破裂
  'EAI_AGAIN',     // DNS临时失败
  'ECONNABORTED'   // 连接中止
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
  return RECOVERABLE_ERROR_CODES.includes(error.code as typeof RECOVERABLE_ERROR_CODES[number])
}

/**
 * 延迟函数
 * @param ms - 延迟毫秒数
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

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
      code: amagiAPIErrorCode.UNKNOWN,
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
  return userAgent.replace(/\s+Edg\/[\d\.]+/g, '')
}

/**
 * 执行网络请求并返回数据（带自动重试）
 * @param config - axios请求配置
 * @param maxRetries - 最大重试次数，默认3次
 * @returns 响应数据或错误结果
 */
export const fetchData = async <T> (
  config: AxiosRequestConfig<T>,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<T | ErrorResult> => {
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
          logger.warn(`网络请求失败 [${error.code}]，${delayMs}ms 后进行第 ${attempt + 1} 次重试...`)
          await delay(delayMs)
          continue
        }

        logger.error('网络请求失败:', error.message)
        return createNetworkErrorResult(error, attempt)
      }
      throw error
    }
  }

  return createNetworkErrorResult(lastError!, maxRetries)
}

const normalizeHeaders = (headers: any): Record<string, string | string[]> => {
  if (headers && typeof headers.toJSON === 'function') {
    return headers.toJSON() as Record<string, string | string[]>
  }
  return (headers ?? {}) as Record<string, string | string[]>
}

/**
 * 执行网络请求并返回完整响应（带自动重试）
 * @param config - axios请求配置
 * @param maxRetries - 最大重试次数，默认3次
 * @returns 完整响应或错误结果
 */
export const fetchResponse = async <T = unknown> (
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
          logger.warn(`网络请求失败 [${error.code}]，${delayMs}ms 后进行第 ${attempt + 1} 次重试...`)
          await delay(delayMs)
          continue
        }

        logger.error('网络请求失败:', error.message)
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
 * @returns 是否为ErrorResult
 */
export const isNetworkErrorResult = (result: unknown): result is ErrorResult => {
  return result !== null &&
    typeof result === 'object' &&
    'success' in result &&
    (result as ErrorResult).success === false
}

/**
 * 获取响应头和数据（带自动重试）
 * @param config - axios请求配置
 * @param maxRetries - 最大重试次数，默认3次
 * @returns 包含headers和data的对象，或错误结果
 */
export const getHeadersAndData = async <T = any> (
  config: AxiosRequestConfig,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<{ headers: RawAxiosResponseHeaders, data: T } | ErrorResult> => {
  const response = await fetchResponse<T>(config, maxRetries)

  // 检查是否为错误结果
  if ('success' in response && response.success === false) {
    return response
  }

  return {
    headers: normalizeHeaders((response as AxiosResponse<T>).headers),
    data: (response as AxiosResponse<T>).data
  }
}
