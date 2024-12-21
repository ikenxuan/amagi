import { Chalk } from 'chalk'
import log4js from 'log4js'

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

const chalk = new Chalk({ level: 3 })

declare module 'log4js' {
  interface Logger {
    chalk?: typeof chalk
    red: typeof chalk.red
    green: typeof chalk.green
    yellow: typeof chalk.yellow
    blue: typeof chalk.blue
    magenta: typeof chalk.magenta
    cyan: typeof chalk.cyan
    white: typeof chalk.white
    gray: typeof chalk.gray
  }
}

const logger = log4js.getLogger('default')

logger.chalk = chalk
logger.red = chalk.red
logger.green = chalk.green
logger.yellow = chalk.yellow
logger.blue = chalk.blue
logger.magenta = chalk.magenta
logger.cyan = chalk.cyan
logger.white = chalk.white
logger.gray = chalk.gray

export { logger }
