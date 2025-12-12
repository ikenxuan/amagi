import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createRequire } from 'node:module'

import { Chalk, ChalkInstance } from 'chalk'
import express from 'express'
import type { Logger, LogLevel } from 'log4js'
import type * as Log4js from 'log4js'

/**
 * 动态获取 log4js 库
 * 优先使用 node-karin/log4js (Karin 环境)
 * 失败则回退到 log4js (独立环境，通过别名映射到 @karinjs/log4js)
 */
const getLog4js = (): typeof Log4js => {
  const require = createRequire(import.meta.url)
  try {
    const lib = require('node-karin/log4js')
    return lib.default || lib
  } catch {
    try {
      const lib = require('log4js')
      return lib.default || lib
    } catch (error) {
      console.error('[Amagi] Failed to load log4js library')
      throw error
    }
  }
}

const log4js = getLog4js()

/** 获取包的绝对路径 */
const getPackageLogsPath = () => {
  const currentFileUrl = import.meta.url
  const currentFilePath = url.fileURLToPath(currentFileUrl)
  const currentDir = path.dirname(currentFilePath)

  let packageRoot = currentDir

  while (packageRoot !== path.dirname(packageRoot)) {
    if (fs.existsSync(path.join(packageRoot, 'package.json'))) {
      break
    }
    packageRoot = path.dirname(packageRoot)
  }

  // 确保 logs 目录存在
  const logsDir = path.join(packageRoot, 'logs')
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
  } catch (error) {
    // 忽略创建目录错误，可能没有权限或者是在只读文件系统中
    // 在这种情况下，我们可能无法写入日志文件，但至少不会让程序崩溃
  }

  return logsDir
}

const logsPath = getPackageLogsPath()

/** 获取日志级别，优先使用环境变量，默认为 info */
const getLogLevel = (): string => {
  const logLevel = process.env.LOG_LEVEL ?? 'info'
  return logLevel
}

const currentLogLevel = getLogLevel()

/** 初始化 logger 配置 */
export const initLogger = () => {
  log4js.configure({
    appenders: {
      console: {
        type: 'stdout',
        layout: {
          type: 'pattern',
          pattern: '%[[amagi][%d{hh:mm:ss.SSS}][%4.4p]%] %m'
        }
      },
      command: {
        type: 'dateFile',
        filename: path.join(logsPath, 'application', 'command'),
        pattern: 'yyyy-MM-dd.log',
        numBackups: 15,
        alwaysIncludePattern: true,
        layout: {
          type: 'pattern',
          pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
        }
      },
      httpConsole: {
        type: 'stdout',
        layout: {
          type: 'pattern',
          pattern: '%[[amagi][%d{hh:mm:ss.SSS}][HTTP]%] %m'
        }
      },
      httpRequest: {
        type: 'dateFile',
        filename: path.join(logsPath, 'http', 'requests'),
        pattern: 'yyyy-MM-dd.log',
        numBackups: 30,
        alwaysIncludePattern: true,
        layout: {
          type: 'pattern',
          pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
        }
      }
    },
    categories: {
      default: { appenders: ['console', 'command'], level: currentLogLevel as LogLevel },
      http: { appenders: ['httpConsole', 'httpRequest'], level: 'debug' }
    },
    pm2: true
  })
}

class CustomLogger {
  private logger: Logger
  public chalk: ChalkInstance
  public red: (text: string) => string
  public green: (text: string) => string
  public yellow: (text: string) => string
  public blue: (text: string) => string
  public magenta: (text: string) => string
  public cyan: (text: string) => string
  public white: (text: string) => string
  public gray: (text: string) => string

  constructor (name: string) {
    this.logger = log4js.getLogger(name)
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

  // 代理 log4js.Logger 的方法
  public info (message: any, ...args: any[]): void {
    this.logger.info(message, ...args)
  }

  public warn (message: any, ...args: any[]): void {
    this.logger.warn(message, ...args)
  }

  public error (message: any, ...args: any[]): void {
    this.logger.error(message, ...args)
  }

  public mark (message: any, ...args: any[]): void {
    this.logger.mark(message, ...args)
  }

  public debug (message: any, ...args: any[]): void {
    this.logger.debug(message, ...args)
  }
}

const logger: CustomLogger = new CustomLogger('default')
const httpLogger: CustomLogger = new CustomLogger('http')

export { httpLogger, logger }

/**
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
      const referer = req.headers['referer'] ?? req.headers['referrer'] ?? '-'
      const contentType = req.headers['content-type'] ?? '-'
      const requestSize = req.headers['content-length'] ?? '0'
      const protocol = req.protocol
      const httpVersion = req.httpVersion

      res.on('finish', () => {
        const responseTime = Date.now() - startTime
        const statusCode = res.statusCode
        const responseSize = res.get('content-length') ?? '0'

        const logData = {
          method,
          url,
          statusCode,
          responseTime: `${responseTime}ms`,
          clientIP,
          referer,
          contentType,
          requestSize: `${requestSize}B`,
          responseSize: `${responseSize}B`,
          protocol,
          httpVersion,
          timestamp: new Date().toISOString()
        }

        httpLogger.debug(JSON.stringify(logData))
        // httpLogger.debug(`[${method}] ${url} | Status: ${statusCode} | Time: ${responseTime}ms | IP: ${clientIP} | Size: ${requestSize}B→${responseSize}B`)
      })
    }

    next()
  }
}
