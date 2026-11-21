import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { appSessionFileForModule, resolveAppSessionFile } from 'amagi/platforms/douyin/app/guest/storage'
import { afterEach, describe, expect, it } from 'vitest'

const directories: string[] = []
const temporary = () => {
  const path = realpathSync(mkdtempSync(join(tmpdir(), 'amagi-app-storage-')))
  directories.push(path)
  return path
}
const fixture = (root: string, entry = 'dist/default/index.mjs') => {
  mkdirSync(dirname(join(root, entry)), { recursive: true })
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@ikenxuan/amagi', exports: { '.': `./${entry}` } }))
  writeFileSync(join(root, entry), '')
  return pathToFileURL(join(root, entry)).href
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    expect(dirname(directory)).toBe(realpathSync(tmpdir()))
    expect(basename(directory)).toMatch(/^amagi-app-storage-/)
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('App 会话保存到实际安装的 amagi 包内', () => {
  it.each([
    ['npm / Yarn node_modules', ['node_modules', '@ikenxuan', 'amagi'], 'dist/default/index.mjs'],
    ['pnpm', ['node_modules', '.pnpm', '@ikenxuan+amagi@7.0.0', 'node_modules', '@ikenxuan', 'amagi'], 'dist/default/index.cjs'],
    ['Yarn PnP unplugged', ['.yarn', 'unplugged', 'amagi-npm-7.0.0', 'node_modules', '@ikenxuan', 'amagi'], 'dist/chunk.mjs'],
    ['workspace source', ['packages', 'core'], 'src/platforms/douyin/app/guest/storage.ts']
  ] as const)('%s：通过包名与模块位置定位 data，不依赖消费项目目录', (_name, segments, entry) => {
    const project = join(temporary(), '中文项目 with spaces')
    mkdirSync(project, { recursive: true })
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer' }))
    const root = join(project, ...segments)
    const url = fixture(root, entry)
    expect(appSessionFileForModule(url)).toBe(join(realpathSync(root), 'data', 'douyin-app-session.json'))
  })

  it('符号链接入口回到同一物理包，避免同一个包保存多份会话', () => {
    const project = temporary()
    const root = join(project, 'physical-package')
    fixture(root)
    const link = join(project, 'linked-package')
    symlinkSync(root, link, 'junction')
    expect(appSessionFileForModule(pathToFileURL(join(link, 'dist/default/index.mjs')).href)).toBe(
      join(realpathSync(root), 'data', 'douyin-app-session.json')
    )
  })

  it('没有找到正确包名时明确失败，不将会话写到其他包', () => {
    const root = temporary()
    const entry = join(root, 'index.mjs')
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'unrelated-package' }))
    writeFileSync(entry, '')
    expect(() => appSessionFileForModule(pathToFileURL(entry).href)).toThrow('@ikenxuan/amagi')
  })

  it('显式 sessionFile 继续优先，并固定为绝对路径', () => {
    expect(resolveAppSessionFile('custom/session.json')).toBe(resolve('custom/session.json'))
  })
})
