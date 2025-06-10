import { Chalk, ChalkInstance } from 'chalk'
import log4js from 'log4js'
import { RequestHandler } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

/** 获取包的绝对路径 */
const getPackageLogsPath = () => {
  const currentFileUrl = import.meta.url
  const currentFilePath = fileURLToPath(currentFileUrl)
  const currentDir = path.dirname(currentFilePath)

  let packageRoot = currentDir

  while (packageRoot !== path.dirname(packageRoot)) {
    if (fs.existsSync(path.join(packageRoot, 'package.json'))) {
      break
    }
    packageRoot = path.dirname(packageRoot)
  }

  return path.join(packageRoot, 'logs')
}

const logsPath = getPackageLogsPath()

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
    default: { appenders: ['console', 'command'], level: 'info' },
    http: { appenders: ['httpConsole', 'httpRequest'], level: 'debug' }
  },
  pm2: true
})

class CustomLogger {
  private logger: log4js.Logger
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
  public info (message: any, ...args: any[]) {
    this.logger.info(message, ...args)
  }

  public warn (message: any, ...args: any[]) {
    this.logger.warn(message, ...args)
  }

  public error (message: any, ...args: any[]) {
    this.logger.error(message, ...args)
  }

  public mark (message: any, ...args: any[]) {
    this.logger.mark(message, ...args)
  }

  public debug (message: any, ...args: any[]) {
    this.logger.debug(message, ...args)
  }
}

const logger = new CustomLogger('default')
const httpLogger = new CustomLogger('http')

export { logger, httpLogger }

/**
 * 创建一个日志中间件，用于记录特定请求的详细信息
 * @param pathsToLog 指定需要记录日志的请求路径数组如果未提供，则记录所有请求的日志
 * @returns
 */
export const logMiddleware = (pathsToLog?: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!pathsToLog || pathsToLog.some(path => req.url.startsWith(path))) {
      const startTime = Date.now()
      const url = req.url
      const method = req.method
      const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress
      const referer = req.headers['referer'] || req.headers['referrer'] || '-'
      const contentType = req.headers['content-type'] || '-'
      const requestSize = req.headers['content-length'] || '0'
      const protocol = req.protocol
      const httpVersion = req.httpVersion

      res.on('finish', () => {
        const responseTime = Date.now() - startTime
        const statusCode = res.statusCode
        const responseSize = res.get('content-length') || '0'

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