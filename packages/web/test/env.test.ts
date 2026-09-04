/**
 * `server/env.ts` —— `.env` 的读写。
 *
 * 这一层值得测的理由与 `outcome.ts` 一样：逻辑是纯的，而它管的是**凭证**。
 * 写错一个分支的后果不可撤销：cookie 进了 git，或者被静默清空。
 *
 * 用真文件（临时目录）而不是 mock `node:fs`：`patchEnvFile` 的全部难点在
 * 「只改点名的键、其它行原样保留」，那件事只有对着真文本才验得出来。
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { cookieEnvName, envIsGitIgnored, patchEnvFile, readEnvFile } from '../server/env'

const dirs: string[] = []

/** 一个临时目录里的文件路径。测完整棵删掉 */
const scratch = (name: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'amagi-env-'))
  dirs.push(dir)
  return join(dir, name)
}

afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true })
})

describe('cookieEnvName', () => {
  it('平台名转大写并加前缀 —— 与 record-corpus.mts 同一条惯例', () => {
    expect(cookieEnvName('douyin')).toBe('AMAGI_COOKIE_DOUYIN')
    expect(cookieEnvName('xiaohongshu')).toBe('AMAGI_COOKIE_XIAOHONGSHU')
  })
})

describe('envIsGitIgnored：写凭证之前的那道闸', () => {
  it('认一条光秃秃的 `.env`', () => {
    const file = scratch('.gitignore')
    writeFileSync(file, 'node_modules/\n.env\ndist/\n', 'utf8')
    expect(envIsGitIgnored(file)).toBe(true)
  })

  it('`/.env` 也认（同样能挡住仓库根那一份）', () => {
    const file = scratch('.gitignore')
    writeFileSync(file, '/.env\n', 'utf8')
    expect(envIsGitIgnored(file)).toBe(true)
  })

  it('**只有 `.env.local` 这类更具体的规则时判 false** —— 它保不住 `.env` 本身', () => {
    const file = scratch('.gitignore')
    writeFileSync(file, '.env.local\n.env.*.local\n', 'utf8')
    expect(envIsGitIgnored(file)).toBe(false)
  })

  it('`.env` 被注释掉时判 false —— 那正是「有人顺手改坏了」的样子', () => {
    const file = scratch('.gitignore')
    writeFileSync(file, '# .env\n', 'utf8')
    expect(envIsGitIgnored(file)).toBe(false)
  })

  it('读不到 `.gitignore` 时判 false，方向选安全那一侧', () => {
    expect(envIsGitIgnored(scratch('does-not-exist'))).toBe(false)
  })

  it('本仓库自己的 `.gitignore` 确实有那条规则', () => {
    // 这条不只是测函数，也在**测仓库的配置**：哪天有人把那行改成 `.env.local`
    // 或加了路径前缀，这里会红 —— 而那正是「控制台开始拒绝保存 cookie」的时刻
    expect(envIsGitIgnored()).toBe(true)
  })
})

describe('readEnvFile', () => {
  it('文件不存在是空表，不是错误', () => {
    expect(readEnvFile(scratch('.env'))).toEqual({})
  })

  it('去掉包裹的引号 —— cookie 里有分号，人手写时一定会加引号', () => {
    const file = scratch('.env')
    writeFileSync(file, 'A="a=1; b=2"\nB=\'x\'\nC=bare\n', 'utf8')
    expect(readEnvFile(file)).toEqual({ A: 'a=1; b=2', B: 'x', C: 'bare' })
  })

  it('注释与空行跳过；值里的 `=` 保留', () => {
    const file = scratch('.env')
    writeFileSync(file, '# 注释\n\nA="k=v=w"\n', 'utf8')
    expect(readEnvFile(file)).toEqual({ A: 'k=v=w' })
  })
})

describe('patchEnvFile：只改点名的键', () => {
  it('**注释与别的键原样保留** —— `.env` 是人手改的文件，整体覆盖会吃掉别人写的东西', () => {
    const file = scratch('.env')
    writeFileSync(file, '# 抖音的\nAMAGI_COOKIE_DOUYIN="old"\n\n# 别的\nOTHER="keep me"\n', 'utf8')
    const result = patchEnvFile({ AMAGI_COOKIE_DOUYIN: 'new' }, file)
    const text = readFileSync(file, 'utf8')
    expect(result).toEqual({ written: 1, removed: 0 })
    expect(text).toContain('# 抖音的')
    expect(text).toContain('# 别的')
    expect(text).toContain('OTHER="keep me"')
    expect(readEnvFile(file).AMAGI_COOKIE_DOUYIN).toBe('new')
  })

  it('空串表示删掉那一项，而不是写一个空值', () => {
    const file = scratch('.env')
    writeFileSync(file, 'A="1"\nB="2"\n', 'utf8')
    expect(patchEnvFile({ A: '' }, file)).toEqual({ written: 0, removed: 1 })
    expect(readEnvFile(file)).toEqual({ B: '2' })
  })

  it('文件里还没有的键追加到末尾', () => {
    const file = scratch('.env')
    writeFileSync(file, 'A="1"\n', 'utf8')
    patchEnvFile({ B: '2' }, file)
    expect(readEnvFile(file)).toEqual({ A: '1', B: '2' })
  })

  it('文件不存在时创建它', () => {
    const file = scratch('.env')
    expect(patchEnvFile({ A: '1' }, file)).toEqual({ written: 1, removed: 0 })
    expect(readEnvFile(file)).toEqual({ A: '1' })
  })

  it('**值一律带引号** —— cookie 里的 `;` 不包起来会被很多解析器当注释开始', () => {
    const file = scratch('.env')
    patchEnvFile({ A: 'k=1; b=2' }, file)
    expect(readFileSync(file, 'utf8')).toContain('A="k=1; b=2"')
  })

  it('值里的引号与反斜杠转义掉，写完还能读回来（往返）', () => {
    const file = scratch('.env')
    const original = 'has "quotes" and \\ backslash'
    patchEnvFile({ A: original }, file)
    expect(readEnvFile(file).A).toBe(original)
  })

  it('末尾恰好一个换行 —— 下次追加不会粘在一起', () => {
    const file = scratch('.env')
    patchEnvFile({ A: '1' }, file)
    const text = readFileSync(file, 'utf8')
    expect(text.endsWith('\n')).toBe(true)
    expect(text.endsWith('\n\n')).toBe(false)
  })

  it('同一个键改两次，第二次覆盖而不是追加出两行', () => {
    const file = scratch('.env')
    patchEnvFile({ A: '1' }, file)
    patchEnvFile({ A: '2' }, file)
    const lines = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.startsWith('A='))
    expect(lines).toHaveLength(1)
    expect(readEnvFile(file).A).toBe('2')
  })
})
