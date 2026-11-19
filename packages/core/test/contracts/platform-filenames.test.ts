import { readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PLATFORMS = join(CORE, 'src', 'platforms')
const PLATFORM_PREFIXES = ['bilibili', 'douyin', 'kuaishou', 'xiaohongshu']
const CHANNEL_PREFIXES = ['app', 'web', 'guest']

const walk = (dir: string): string[] => {
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else if (name.endsWith('.ts')) files.push(path)
  }
  return files
}

/** 平台目录下所有 `endpoints/`（含 web / app 下的嵌套目录）里的 .ts 文件 */
const endpointFiles = (): string[] => {
  const files: string[] = []
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (!statSync(path).isDirectory()) continue
      if (name === 'endpoints') files.push(...walk(path))
      else visit(path)
    }
  }
  visit(PLATFORMS)
  return files
}

const relativePath = (file: string): string => relative(CORE, file).replace(/\\/g, '/')
const stemOf = (file: string): string => basename(file, '.ts')

describe('平台端点文件命名', () => {
  const files = endpointFiles()

  it('扫描覆盖到平铺与 web/app 嵌套目录', () => {
    expect(files.length).toBeGreaterThan(100)
    expect(files.some((file) => relativePath(file).includes('/douyin/web/endpoints/'))).toBe(true)
    expect(files.some((file) => relativePath(file).includes('/douyin/app/endpoints/'))).toBe(true)
  })

  it('文件名不带平台或通道前缀', () => {
    const violations: string[] = []
    for (const file of files) {
      const stem = stemOf(file)
      for (const prefix of [...PLATFORM_PREFIXES, ...CHANNEL_PREFIXES]) {
        if (stem.startsWith(prefix)) violations.push(`${relativePath(file)}: 文件名「${stem}」不应以「${prefix}」开头`)
      }
    }
    expect(violations).toEqual([])
  })

  it('guest/ 下的文件名不带 guest 前缀', () => {
    const violations: string[] = []
    for (const file of files) {
      const path = relativePath(file)
      if (!path.includes('/guest/')) continue
      const stem = stemOf(file)
      if (stem.startsWith('guest')) violations.push(`${path}: guest 目录下的文件名「${stem}」不应以「guest」开头`)
    }
    expect(violations).toEqual([])
  })
})
