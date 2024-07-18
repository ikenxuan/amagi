import networks from './networks';
import cfg from './config';
import log4js from 'log4js';


log4js.configure({
  appenders: {
    console: {
      type: 'stdout',
      layout: {
        type: 'pattern',
        pattern: '[%[%d{yyyy-MM-dd hh:mm:ss}] [%p] %m%]'
      }
    }
  },
  categories: {
    default: { appenders: ['console'], level: 'debug' },
  },
});

const logger = log4js.getLogger();

export { networks, cfg, logger }