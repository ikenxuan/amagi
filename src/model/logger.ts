import log from 'loglevel'
import prefix from 'loglevel-plugin-prefix'
import chalk, { ChalkInstance } from 'chalk'

interface LogLevelColors {
  [key: string]: ChalkInstance
}

const colors: LogLevelColors = {
  TRACE: chalk.magenta,
  DEBUG: chalk.cyan,
  INFO: chalk.blue,
  WARN: chalk.yellow,
  ERROR: chalk.red,
}

prefix.reg(log)
log.enableAll()

prefix.apply(log, {
  format (level, name, timestamp) {
    const levelKey = level.toUpperCase()
    if (!(levelKey in colors)) {
      throw new Error(`Invalid log level: ${levelKey}`)
    }
    return `${chalk.gray(`[${timestamp}]`)} ${colors[levelKey](level)} ${chalk.green(`${name}:`)}`
  },
})

prefix.apply(log.getLogger('critical'), {
  format (level, name, timestamp) {
    return chalk.red.bold(`[${timestamp}] ${level} ${name}:`)
  },
})

const logger = log
export default logger