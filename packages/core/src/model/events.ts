/**
 * Amagi 事件系统
 * @module model/events
 * @description 提供类型安全的事件发射器，用于日志、HTTP、网络和 API 事件的监听与触发
 */

import { EventEmitter } from 'node:events'

// ============================================================================
// 事件类型定义
// ============================================================================

/**
 * Amagi 支持的事件类型
 * @description
 * - `log:*` - 日志相关事件
 * - `http:*` - HTTP 请求/响应事件
 * - `network:*` - 网络层事件（重试、错误）
 * - `api:*` - API 调用结果事件
 */
export type AmagiEventType =
  | 'log:info'
  | 'log:warn'
  | 'log:error'
  | 'log:debug'
  | 'log:mark'
  | 'http:request'
  | 'http:response'
  | 'http:error'
  | 'network:retry'
  | 'network:error'
  | 'api:success'
  | 'api:error'

// ============================================================================
// 事件数据接口
// ============================================================================

/**
 * 日志事件数据
 * @description 所有 `log:*` 事件的数据结构
 */
export interface LogEventData {
  /** 日志级别 */
  level: 'info' | 'warn' | 'error' | 'debug' | 'mark'
  /** 日志消息 */
  message: string
  /** 附加参数 */
  args?: unknown[]
  /** 事件时间戳 */
  timestamp: Date
}

/**
 * HTTP 请求事件数据
 * @description `http:request` 事件的数据结构
 */
export interface HttpRequestEventData {
  /** 请求方法 (GET, POST, etc.) */
  method: string
  /** 请求 URL */
  url: string
  /** 请求头 */
  headers?: Record<string, string>
  /** 事件时间戳 */
  timestamp: Date
}

/**
 * HTTP 响应事件数据
 * @description `http:response` 事件的数据结构
 */
export interface HttpResponseEventData {
  /** 请求方法 */
  method: string
  /** 请求 URL */
  url: string
  /** HTTP 状态码 */
  statusCode: number
  /** 响应耗时 (毫秒) */
  responseTime: number
  /** 客户端 IP */
  clientIP?: string
  /** 请求体大小 */
  requestSize?: string
  /** 响应体大小 */
  responseSize?: string
  /** 事件时间戳 */
  timestamp: Date
}

/**
 * 网络重试事件数据
 * @description `network:retry` 事件的数据结构
 */
export interface NetworkRetryEventData {
  /** 错误代码 */
  errorCode: string
  /** 当前重试次数 */
  attempt: number
  /** 最大重试次数 */
  maxRetries: number
  /** 重试延迟 (毫秒) */
  delayMs: number
  /** 请求 URL */
  url?: string
  /** 事件时间戳 */
  timestamp: Date
}

/**
 * 网络错误事件数据
 * @description `network:error` 和 `http:error` 事件的数据结构
 */
export interface NetworkErrorEventData {
  /** 错误代码 */
  errorCode: string
  /** 错误消息 */
  message: string
  /** 已重试次数 */
  retries: number
  /** 请求 URL */
  url?: string
  /** 事件时间戳 */
  timestamp: Date
}

/**
 * API 成功事件数据
 * @description `api:success` 事件的数据结构
 */
export interface ApiSuccessEventData {
  /** 请求平台 */
  platform: 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'
  /** 调用的 API 方法 */
  methodType: string
  /** API 响应数据 (Result 结构) */
  response: unknown
  /** HTTP 状态码 */
  statusCode: number
  /** 请求耗时 (毫秒) */
  duration: number
  /** 事件时间戳 */
  timestamp: Date
}

/**
 * API 错误事件数据
 * @description `api:error` 事件的数据结构
 */
export interface ApiErrorEventData {
  /** 请求平台 */
  platform: 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'
  /** 调用的 API 方法 */
  methodType: string
  /** 错误代码 */
  errorCode?: string | number
  /** 错误消息 */
  errorMessage: string
  /** 请求 URL */
  url?: string
  /** 请求耗时 (毫秒) */
  duration?: number
  /** 事件时间戳 */
  timestamp: Date
}

/**
 * 事件类型到数据的映射
 * @description 用于类型推断，确保事件名称与数据类型匹配
 */
export interface AmagiEventMap {
  'log:info': LogEventData
  'log:warn': LogEventData
  'log:error': LogEventData
  'log:debug': LogEventData
  'log:mark': LogEventData
  'http:request': HttpRequestEventData
  'http:response': HttpResponseEventData
  'http:error': NetworkErrorEventData
  'network:retry': NetworkRetryEventData
  'network:error': NetworkErrorEventData
  'api:success': ApiSuccessEventData
  'api:error': ApiErrorEventData
}

// ============================================================================
// 类型安全的事件发射器
// ============================================================================

/**
 * 类型安全的事件发射器
 * @description 继承自 Node.js EventEmitter，提供泛型约束确保事件名称与数据类型匹配
 */
class TypedEventEmitter extends EventEmitter {
  /**
   * 触发事件
   * @param event - 事件名称
   * @param data - 事件数据
   * @returns 是否有监听器处理了该事件
   */
  emit<K extends AmagiEventType> (event: K, data: AmagiEventMap[K]): boolean {
    return super.emit(event, data)
  }

  /**
   * 注册事件监听器
   * @param event - 事件名称
   * @param listener - 事件处理函数
   * @returns this (支持链式调用)
   */
  on<K extends AmagiEventType> (event: K, listener: (data: AmagiEventMap[K]) => void): this {
    return super.on(event, listener)
  }

  /**
   * 注册一次性事件监听器
   * @param event - 事件名称
   * @param listener - 事件处理函数 (只触发一次)
   * @returns this (支持链式调用)
   */
  once<K extends AmagiEventType> (event: K, listener: (data: AmagiEventMap[K]) => void): this {
    return super.once(event, listener)
  }

  /**
   * 移除事件监听器
   * @param event - 事件名称
   * @param listener - 要移除的事件处理函数
   * @returns this (支持链式调用)
   */
  off<K extends AmagiEventType> (event: K, listener: (data: AmagiEventMap[K]) => void): this {
    return super.off(event, listener)
  }
}

/**
 * Amagi 全局事件发射器实例
 * @description 单例模式，所有模块共享同一个事件总线
 * @example
 * ```typescript
 * import { amagiEvents } from 'amagi/model/events'
 *
 * // 监听 API 成功事件
 * amagiEvents.on('api:success', (data) => {
 *   console.log(`[${data.platform}] ${data.methodType} 耗时 ${data.duration}ms`)
 * })
 * ```
 */
export const amagiEvents = new TypedEventEmitter()

// ============================================================================
// 事件发射函数
// ============================================================================

/**
 * 发射日志事件
 * @param level - 日志级别
 * @param message - 日志消息
 * @param args - 附加参数
 */
export const emitLog = (level: LogEventData['level'], message: string, ...args: unknown[]): void => {
  amagiEvents.emit(`log:${level}`, {
    level,
    message,
    args: args.length > 0 ? args : undefined,
    timestamp: new Date()
  })
}

/**
 * 发射 HTTP 请求事件
 * @param data - 请求数据 (不含 timestamp)
 */
export const emitHttpRequest = (data: Omit<HttpRequestEventData, 'timestamp'>): void => {
  amagiEvents.emit('http:request', { ...data, timestamp: new Date() })
}

/**
 * 发射 HTTP 响应事件
 * @param data - 响应数据 (不含 timestamp)
 */
export const emitHttpResponse = (data: Omit<HttpResponseEventData, 'timestamp'>): void => {
  amagiEvents.emit('http:response', { ...data, timestamp: new Date() })
}

/**
 * 发射网络重试事件
 * @param data - 重试数据 (不含 timestamp)
 */
export const emitNetworkRetry = (data: Omit<NetworkRetryEventData, 'timestamp'>): void => {
  amagiEvents.emit('network:retry', { ...data, timestamp: new Date() })
}

/**
 * 发射网络错误事件
 * @param data - 错误数据 (不含 timestamp)
 */
export const emitNetworkError = (data: Omit<NetworkErrorEventData, 'timestamp'>): void => {
  amagiEvents.emit('network:error', { ...data, timestamp: new Date() })
}

/**
 * 发射 API 成功事件
 * @param data - 成功数据 (不含 timestamp)
 */
export const emitApiSuccess = (data: Omit<ApiSuccessEventData, 'timestamp'>): void => {
  amagiEvents.emit('api:success', { ...data, timestamp: new Date() })
}

/**
 * 发射 API 错误事件
 * @param data - 错误数据 (不含 timestamp)
 */
export const emitApiError = (data: Omit<ApiErrorEventData, 'timestamp'>): void => {
  amagiEvents.emit('api:error', { ...data, timestamp: new Date() })
}

// ============================================================================
// 便捷日志函数
// ============================================================================

/**
 * 发射 info 级别日志
 * @param message - 日志消息
 * @param args - 附加参数
 */
export const emitLogInfo = (message: string, ...args: unknown[]): void => {
  emitLog('info', message, ...args)
}

/**
 * 发射 warn 级别日志
 * @param message - 日志消息
 * @param args - 附加参数
 */
export const emitLogWarn = (message: string, ...args: unknown[]): void => {
  emitLog('warn', message, ...args)
}

/**
 * 发射 error 级别日志
 * @param message - 日志消息
 * @param args - 附加参数
 */
export const emitLogError = (message: string, ...args: unknown[]): void => {
  emitLog('error', message, ...args)
}

/**
 * 发射 debug 级别日志
 * @param message - 日志消息
 * @param args - 附加参数
 */
export const emitLogDebug = (message: string, ...args: unknown[]): void => {
  emitLog('debug', message, ...args)
}

/**
 * 发射 mark 级别日志 (用于重要标记)
 * @param message - 日志消息
 * @param args - 附加参数
 */
export const emitLogMark = (message: string, ...args: unknown[]): void => {
  emitLog('mark', message, ...args)
}

export default amagiEvents
