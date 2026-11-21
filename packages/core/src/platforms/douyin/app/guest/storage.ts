import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 从模块实际位置查找包根，兼容源码、分发文件、依赖提升与符号链接。 */
export const appSessionFileForModule = (moduleUrl: string): string => {
  let directory = dirname(realpathSync(fileURLToPath(moduleUrl)))
  for (;;) {
    const manifest = join(directory, 'package.json')
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === '@ikenxuan/amagi') {
      return join(directory, 'data', 'douyin-app-session.json')
    }
    const parent = dirname(directory)
    if (parent === directory) throw new Error('无法定位 @ikenxuan/amagi 包目录，请显式配置 douyin.app.sessionFile')
    directory = parent
  }
}

let defaultFile: string | undefined
export const defaultAppSessionFile = (): string => {
  return (defaultFile ??= appSessionFileForModule(import.meta.url))
}

export const resolveAppSessionFile = (file?: string): string => (file ? resolve(file) : defaultAppSessionFile())
