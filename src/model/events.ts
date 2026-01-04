import { EventEmitter } from 'node:events'

/**
 * Amagi 事件类型定义
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

/**
 * 日志事件数据
 */
export interface LogEventData {
  level: 'info' | 'warn' | 'error' | 'debug' | 'mark'
  message: string
  args?: unknown[]
  timestamp: Date
}

/**
 * HTTP 请求事件数据
 */
export interface HttpRequestEventData {
  method: string
  url: string
  headers?: Record<string, string>
  timestamp: Date
}

/**
 * HTTP 响应事件数据
 */
export interface HttpResponseEventData {
  method: string
  url: string
  statusCode: number
  responseTime: number
  clientIP?: string
  requestSize?: string
  responseSize?: string
  timestamp: Date
}

/**
 * 网络重试事件数据
 */
export interface NetworkRetryEventData {
  errorCode: string
  attempt: number
  maxRetries: number
  delayMs: number
  url?: string
  timestamp: Date
}

/**
 * 网络错误事件数据
 */
export interface NetworkErrorEventData {
  errorCode: string
  message: string
  retries: number
  url?: string
  timestamp: Date
}

/**
 * API 成功事件数据
 */
export interface ApiSuccessEventData {
  platform: 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'
  methodType: string
  timestamp: Date
}

/**
 * API 错误事件数据
 */
export interface ApiErrorEventData {
  platform: 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'
  methodType: string
  errorCode?: string | number
  errorMessage: string
  url?: string
  timestamp: Date
}

/**
 * 事件数据映射
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

/**
 * 类型安全的事件发射器
 */
class TypedEventEmitter extends EventEmitter {
  emit<K extends AmagiEventType> (event: K, data: AmagiEventMap[K]): boolean {
    return super.emit(event, data)
  }

  on<K extends AmagiEventType> (event: K, listener: (data: AmagiEventMap[K]) => void): this {
    return super.on(event, listener)
  }

  once<K extends AmagiEventType> (event: K, listener: (data: AmagiEventMap[K]) => void): this {
    return super.once(event, listener)
  }

  off<K extends AmagiEventType> (event: K, listener: (data: AmagiEventMap[K]) => void): this {
    return super.off(event, listener)
  }
}

/**
 * Amagi 全局事件发射器实例
 */
export const amagiEvents = new TypedEventEmitter()

/**
 * 发射日志事件
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
 */
export const emitHttpRequest = (data: Omit<HttpRequestEventData, 'timestamp'>): void => {
  amagiEvents.emit('http:request', { ...data, timestamp: new Date() })
}

/**
 * 发射 HTTP 响应事件
 */
export const emitHttpResponse = (data: Omit<HttpResponseEventData, 'timestamp'>): void => {
  amagiEvents.emit('http:response', { ...data, timestamp: new Date() })
}

/**
 * 发射网络重试事件
 */
export const emitNetworkRetry = (data: Omit<NetworkRetryEventData, 'timestamp'>): void => {
  amagiEvents.emit('network:retry', { ...data, timestamp: new Date() })
}

/**
 * 发射网络错误事件
 */
export const emitNetworkError = (data: Omit<NetworkErrorEventData, 'timestamp'>): void => {
  amagiEvents.emit('network:error', { ...data, timestamp: new Date() })
}

/**
 * 发射 API 成功事件
 */
export const emitApiSuccess = (data: Omit<ApiSuccessEventData, 'timestamp'>): void => {
  amagiEvents.emit('api:success', { ...data, timestamp: new Date() })
}

/**
 * 发射 API 错误事件
 */
export const emitApiError = (data: Omit<ApiErrorEventData, 'timestamp'>): void => {
  amagiEvents.emit('api:error', { ...data, timestamp: new Date() })
}

// ============================================================================
// 便捷日志函数
// ============================================================================

/**
 * 发射 info 级别日志
 */
export const emitLogInfo = (message: string, ...args: unknown[]): void => {
  emitLog('info', message, ...args)
}

/**
 * 发射 warn 级别日志
 */
export const emitLogWarn = (message: string, ...args: unknown[]): void => {
  emitLog('warn', message, ...args)
}

/**
 * 发射 error 级别日志
 */
export const emitLogError = (message: string, ...args: unknown[]): void => {
  emitLog('error', message, ...args)
}

/**
 * 发射 debug 级别日志
 */
export const emitLogDebug = (message: string, ...args: unknown[]): void => {
  emitLog('debug', message, ...args)
}

/**
 * 发射 mark 级别日志 (用于重要标记)
 */
export const emitLogMark = (message: string, ...args: unknown[]): void => {
  emitLog('mark', message, ...args)
}

export default amagiEvents
