import log4js from 'log4js'

log4js.configure({
  appenders: {
    console: {
      type: 'stdout',
      layout: {
        type: 'pattern',
        pattern: '%[[amagi][%d{hh:mm:ss.SSS}][%4.4p]%] %m',
      },
    },
    command: {
      type: 'dateFile',
      filename: 'logs/command',
      pattern: 'yyyy-MM-dd.log',
      numBackups: 15,
      alwaysIncludePattern: true,
      layout: {
        type: 'pattern',
        pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m',
      },
    },
    pluginConsole: {
      type: 'stdout',
      layout: {
        type: 'pattern',
        pattern: '%[[%d{hh:mm:ss.SSS}][%4.4p][plugin]%] %m',
      },
    },
    pluginCommand: {
      type: 'dateFile',
      filename: 'logs/pluginCommand',
      pattern: 'yyyy-MM-dd.log',
      numBackups: 15,
      alwaysIncludePattern: true,
      layout: { type: 'pattern', pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m' }
    },
  },
  categories: {
    default: { appenders: ['console', 'command'], level: 'info' }, // 添加default类别
  },
  pm2: true,
})

const logger = log4js.getLogger()
export { logger }