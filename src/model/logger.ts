import chalk from 'chalk'
import log4js from 'log4js'
import { RequestHandler } from 'express'

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
      filename: 'logs/command',
      pattern: 'yyyy-MM-dd.log',
      numBackups: 15,
      alwaysIncludePattern: true,
      layout: {
        type: 'pattern',
        pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
      }
    },
    pluginConsole: {
      type: 'stdout',
      layout: {
        type: 'pattern',
        pattern: '%[[%d{hh:mm:ss.SSS}][%4.4p][plugin]%] %m'
      }
    },
    pluginCommand: {
      type: 'dateFile',
      filename: 'logs/pluginCommand',
      pattern: 'yyyy-MM-dd.log',
      numBackups: 15,
      alwaysIncludePattern: true,
      layout: { type: 'pattern', pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m' }
    }
  },
  categories: {
    default: { appenders: ['console', 'command'], level: 'info' } // 添加default类别
  },
  pm2: true
})

class CustomLogger {
  private logger: log4js.Logger
  public chalk: typeof chalk
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
    this.chalk = chalk
    this.red = chalk.red.bind(chalk)
    this.green = chalk.green.bind(chalk)
    this.yellow = chalk.yellow.bind(chalk)
    this.blue = chalk.blue.bind(chalk)
    this.magenta = chalk.magenta.bind(chalk)
    this.cyan = chalk.cyan.bind(chalk)
    this.white = chalk.white.bind(chalk)
    this.gray = chalk.gray.bind(chalk)
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
}

const logger = new CustomLogger('default')

export { logger }

export const logMiddleware: RequestHandler = (req, res, next) => {
  const startTime = Date.now()
  const url = req.url
  const method = req.method
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress

  res.on('finish', () => {
    const responseTime = Date.now() - startTime
    const statusCode = res.statusCode

    logger.info(`[${method}] ${url} (Status: ${statusCode}, Time: ${responseTime}ms, Client: ${clientIP})`)
  })

  next()
}