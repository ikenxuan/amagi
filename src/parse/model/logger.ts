import log4js from 'log4js';


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
      type: 'dateFile', // 可以是console,dateFile,file,Logstash等
      filename: 'logs/command', // 将会按照filename和pattern拼接文件名
      pattern: 'yyyy-MM-dd.log',
      numBackups: 15,
      alwaysIncludePattern: true,
      layout: {
        type: 'pattern',
        pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
      }
    },
  },
  categories: {
    default: { appenders: ['console'], level: 'debug' },
  },
});

const logger = log4js.getLogger();
export { logger }