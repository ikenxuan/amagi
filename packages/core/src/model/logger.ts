/**
 * @deprecated v6 已废弃日志模块，请使用事件系统替代
 * @see {@link ../events.ts} 使用 amagiEvents 监听日志事件
 *
 * 迁移示例:
 * ```typescript
 * import { amagiEvents } from '@ikenxuan/amagi'
 *
 * amagiEvents.on('log:info', (data) => console.log(data.message))
 * amagiEvents.on('log:error', (data) => console.error(data.message))
 * ```
 */

import { Chalk, ChalkInstance } from 'chalk'
import express from 'express'

import { emitHttpResponse, emitLog } from './events'

/**
 * @deprecated v6 已废弃，请使用事件系统替代
 * 初始化 logger 配置 - 此函数现在为空操作
 */
export const initLogger = () => {
  // v6 已移除 log4js，此函数保留仅为兼容性
}

/**
 * @deprecated v6 已废弃，请使用事件系统替代
 * 简化的日志类，仅发射事件，不再依赖 log4js
 */
class SimpleLogger {
  public chalk: ChalkInstance
  public red: (text: string) => string
  public green: (text: string) => string
  public yellow: (text: string) => string
  public blue: (text: string) => string
  public magenta: (text: string) => string
  public cyan: (text: string) => string
  public white: (text: string) => string
  public gray: (text: string) => string

  constructor () {
    this.chalk = new Chalk()
    this.red = this.chalk.red
    this.green = this.chalk.green
    this.yellow = this.chalk.yellow
    this.blue = this.chalk.blue
    this.magenta = this.chalk.magenta
    this.cyan = this.chalk.cyan
    this.white = this.chalk.white
    this.gray = this.chalk.gray
  }

  public info (message: any, ...args: any[]): void {
    emitLog('info', String(message), ...args)
  }

  public warn (message: any, ...args: any[]): void {
    emitLog('warn', String(message), ...args)
  }

  public error (message: any, ...args: any[]): void {
    emitLog('error', String(message), ...args)
  }

  public mark (message: any, ...args: any[]): void {
    emitLog('mark', String(message), ...args)
  }

  public debug (message: any, ...args: any[]): void {
    emitLog('debug', String(message), ...args)
  }
}

/**
 * @deprecated v6 已废弃，请使用事件系统替代
 */
const logger: SimpleLogger = new SimpleLogger()

/**
 * @deprecated v6 已废弃，请使用事件系统替代
 */
const httpLogger: SimpleLogger = new SimpleLogger()

export { httpLogger, logger }

/**
 * @deprecated v6 已废弃，请使用事件系统监听 http:response 事件
 * 创建一个日志中间件，用于记录特定请求的详细信息
 * @param pathsToLog 指定需要记录日志的请求路径数组如果未提供，则记录所有请求的日志
 * @returns
 */
export const logMiddleware = (pathsToLog?: string[]): express.RequestHandler => {
  return (req, res, next) => {
    if (!pathsToLog || pathsToLog.some(path => req.url.startsWith(path))) {
      const startTime = Date.now()
      const url = req.url
      const method = req.method
      const clientIP = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress

      res.on('finish', () => {
        const responseTime = Date.now() - startTime
        const statusCode = res.statusCode
        const requestSize = req.headers['content-length'] ?? '0'
        const responseSize = res.get('content-length') ?? '0'

        // 发射 HTTP 响应事件
        emitHttpResponse({
          method,
          url,
          statusCode,
          responseTime,
          clientIP: String(clientIP),
          requestSize: `${requestSize}B`,
          responseSize: `${responseSize}B`
        })
      })
    }

    next()
  }
}
