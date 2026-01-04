/**
 * Amagi v6 废弃警告系统
 * 用于在使用旧 API 时打印迁移提示
 */

import { Chalk } from 'chalk'

const chalk = new Chalk()

/**
 * 是否已显示过警告（避免重复打印）
 */
const shownWarnings = new Set<string>()

/**
 * 打印废弃警告
 * @param oldApi - 旧 API 名称
 * @param newApi - 新 API 名称
 * @param example - 使用示例
 */
export function printDeprecationWarning (
  oldApi: string,
  newApi: string,
  example?: string
): void {
  const key = `${oldApi}->${newApi}`
  if (shownWarnings.has(key)) return
  shownWarnings.add(key)

  const border = chalk.yellow('━'.repeat(70))
  const warning = chalk.bold.yellow('⚠️  DEPRECATION WARNING')
  const oldLabel = chalk.bold('旧 API:')
  const newLabel = chalk.bold('新 API:')
  const exampleLabel = chalk.bold('示例:')
  const docLabel = chalk.bold('文档:')

  console.warn(`
${border}
${warning}

${oldLabel} ${chalk.red.strikethrough(oldApi)}
${newLabel} ${chalk.green(newApi)}
${example ? `${exampleLabel} ${chalk.cyan(example)}` : ''}
${docLabel} ${chalk.blue('https://github.com/ikenxuan/amagi/blob/main/docs/MIGRATION-v6.md')}

${chalk.gray('此警告在 v7 版本将变为错误，请尽快迁移。')}
${border}
`)
}

/**
 * 打印方法名迁移警告
 * @param platform - 平台名称
 * @param oldMethod - 旧方法名（中文）
 * @param newMethod - 新方法名（英文）
 */
export function printMethodMigrationWarning (
  platform: 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu',
  oldMethod: string,
  newMethod: string
): void {
  const key = `method:${platform}:${oldMethod}`
  if (shownWarnings.has(key)) return
  shownWarnings.add(key)

  const platformNames = {
    douyin: '抖音',
    bilibili: 'B站',
    kuaishou: '快手',
    xiaohongshu: '小红书'
  }

  const border = chalk.yellow('━'.repeat(70))
  const warning = chalk.bold.yellow('⚠️  方法名迁移提示')

  const oldApiExample = `get${platform.charAt(0).toUpperCase() + platform.slice(1)}Data('${oldMethod}', options)`
  const newApiExample = `${platform}Fetcher.${newMethod}(options)`

  console.warn(`
${border}
${warning}

${chalk.bold('平台:')} ${platformNames[platform]} (${platform})
${chalk.bold('旧方法名:')} ${chalk.red(`'${oldMethod}'`)} ${chalk.gray('(中文，已废弃)')}
${chalk.bold('新方法名:')} ${chalk.green(`'${newMethod}'`)} ${chalk.gray('(英文，推荐)')}

${chalk.bold('旧用法:')}
  ${chalk.red.dim(oldApiExample)}

${chalk.bold('新用法:')}
  ${chalk.green(`import { ${platform}Fetcher } from '@ikenxuan/amagi'`)}
  ${chalk.green(newApiExample)}

${chalk.gray('v6 版本仍支持中文方法名，但建议迁移到英文方法名以获得更好的类型提示。')}
${border}
`)
}

/**
 * 打印英文方法名不支持警告（用于旧 API）
 */
export function printEnglishMethodNotSupportedWarning (
  platform: 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu',
  englishMethod: string,
  chineseMethod: string
): void {
  const key = `english:${platform}:${englishMethod}`
  if (shownWarnings.has(key)) return
  shownWarnings.add(key)

  const border = chalk.yellow('━'.repeat(70))
  const warning = chalk.bold.yellow('⚠️  方法名错误')

  console.warn(`
${border}
${warning}

${chalk.bold('您使用了英文方法名:')} ${chalk.red(`'${englishMethod}'`)}
${chalk.bold('旧 API 仅支持中文方法名:')} ${chalk.green(`'${chineseMethod}'`)}

${chalk.bold('方案 1 - 使用中文方法名 (兼容旧版):')}
  ${chalk.cyan(`get${platform.charAt(0).toUpperCase() + platform.slice(1)}Data('${chineseMethod}', options)`)}

${chalk.bold('方案 2 - 使用新 API (推荐):')}
  ${chalk.green(`import { ${platform}Fetcher } from '@ikenxuan/amagi'`)}
  ${chalk.green(`${platform}Fetcher.${englishMethod}(options)`)}

${border}
`)
}

/**
 * 清除已显示的警告记录（用于测试）
 */
export function clearWarnings (): void {
  shownWarnings.clear()
}
