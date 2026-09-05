/**
 * KNOWN-DEFECT 清单守卫。
 *
 * 测试套件里用 `KNOWN-DEFECT:` 前缀标注「v6 当前行为是错的，但已被钉死」的用例。
 * 它们构成 v7 的修复清单：
 *   - 修掉一个缺陷 -> 对应用例必然失败 -> 必须显式删除或改写它
 *   - 因此这个数字只应下降，不应上升
 *
 * 其余用例是「v7 不得破坏」的清单。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const TEST_ROOT = join(import.meta.dirname, '..')

const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === '__snapshots__') continue
      out.push(...walk(full))
    } else if (entry === 'known-defects.test.ts') {
      // 跳过自身，否则会匹配到本文件里的 KNOWN-DEFECT 字面量
      continue
    } else if (entry.endsWith('.test.ts') || entry.endsWith('.test-d.ts')) {
      out.push(full)
    }
  }
  return out
}

const collectDefects = () => {
  const byFile = new Map<string, string[]>()
  for (const file of walk(TEST_ROOT)) {
    const titles: string[] = []
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/['"`](KNOWN-DEFECT: [^'"`]+)['"`]/)
      if (match) titles.push(match[1])
    }
    if (titles.length > 0) {
      const rel = file
        .slice(TEST_ROOT.length + 1)
        .split(String.fromCharCode(92))
        .join('/')
      byFile.set(rel, titles)
    }
  }
  return byFile
}

describe('KNOWN-DEFECT 清单', () => {
  const defects = collectDefects()

  it('清单内容被锁定（v7 每修一条，此快照必须同步更新）', () => {
    const flat: Record<string, string[]> = {}
    for (const [file, titles] of [...defects.entries()].sort()) flat[file] = titles
    expect(flat).toMatchSnapshot()
  })

  it('清单不为空（说明标注机制生效）', () => {
    expect(defects.size).toBeGreaterThan(0)
  })

  it('每条都写明了缺陷内容，而不只是一个前缀', () => {
    for (const titles of defects.values()) {
      for (const title of titles) {
        expect(title.length, title).toBeGreaterThan('KNOWN-DEFECT: '.length + 4)
      }
    }
  })
})
