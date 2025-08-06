import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { logger } from './logger'

/**
 * 清理User-Agent中的Edge标识，确保请求兼容性
 * @param userAgent - 原始User-Agent字符串
 * @returns 清理后的User-Agent字符串
 */
const cleanUserAgent = (userAgent: string): string => {
  return userAgent.replace(/\s+Edg\/[\d\.]+/g, '')
}

/**
 * 执行网络请求并返回数据
 * @param config - axios请求配置
 * @returns 响应数据
 */
export const fetchData = async <T = any> (config: AxiosRequestConfig): Promise<T> => {
  try {
    // 清理请求配置中的User-Agent
    const cleanedConfig = { ...config }
    if (cleanedConfig.headers && cleanedConfig.headers['User-Agent']) {
      cleanedConfig.headers['User-Agent'] = cleanUserAgent(cleanedConfig.headers['User-Agent'] as string)
    }

    const response = await axios<T>(cleanedConfig)

    if (response.status === 429) {
      logger.error('HTTP 响应状态码: 429')
      throw new Error('ratelimit triggered, 触发速率限制！')
    }

    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error('网络请求失败:', error.message)
      throw error
    }
    throw error
  }
}

/**
 * 执行网络请求并返回完整响应对象
 * @param config - axios请求配置
 * @returns axios响应对象
 */
export const fetchResponse = async <T = unknown> (config: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  try {
    // 清理请求配置中的User-Agent
    const cleanedConfig = { ...config }
    if (cleanedConfig.headers && cleanedConfig.headers['User-Agent']) {
      cleanedConfig.headers['User-Agent'] = cleanUserAgent(cleanedConfig.headers['User-Agent'] as string)
    }

    return await axios<T>(cleanedConfig)
  } catch (error) {
    if (error instanceof AxiosError) {
      throw error
    }
    throw new Error('网络请求失败')
  }
}

/**
 * 获取响应头和数据
 * @param config - axios请求配置
 * @returns 包含headers和data的对象
 */
export const getHeadersAndData = async <T = any> (
  config: AxiosRequestConfig
): Promise<{ headers: AxiosResponse<T>['headers'], data: T }> => {
  try {
    const response = await fetchResponse<T>(config)
    return {
      headers: response.headers,
      data: response.data
    }
  } catch (error) {
    logger.error('获取响应头和数据失败:', error)
    return { headers: {}, data: {} as T }
  }
}