import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { AdditionalType, MajorType } from 'amagi/types/ReturnDataType/Bilibili/Dynamic/index'
import { describe, expect, it } from 'vitest'

/**
 * B站动态那两个手写 enum 的覆盖率账本。
 *
 * `RESPONSE-TYPE-AUTOGEN-PRD.md` §1.1 记了一句「`MajorType` 声明了 17 个成员、
 * `AdditionalType` 10 个，却只有 6 个 `DYNAMIC_TYPE_*` 真的建了模型 —— 声明的枚举
 * 空间远大于已建模的变体，这个缺口现在没人知道有多大」。
 *
 * 数出来的结果**比那句话更糟**：两个 enum 的 27 个成员，被已建模的类型引用了
 * **0 次**。既没有 `MajorType.ARCHIVE` 这样的引用，也没有 `'MAJOR_TYPE_ARCHIVE'`
 * 这样的字面量；`MajorType` / `AdditionalType` 在整个 `src/` 里除了自己的声明文件
 * 之外没有任何 import。而它们本该描述的那个字段（`modules.module_dynamic.major.type`）
 * 类型是裸 `string`。
 *
 * 也就是说：**27 个带中文语义注释的成员是纯声明**，人的知识写在了那里，
 * 但类型系统与调用方都拿不到。这正是那份 PRD 要解决的东西的一个缩影 ——
 * 手写语义与实测形状分居两处，谁也不知道对不对得上。
 *
 * 这个文件**不修**这件事（要么把 `major.type` 收窄到 enum，要么删掉 enum，
 * 两条都要先有样本才能定），只把账记住：数字一变就会红，于是「缺口有多大」
 * 从没人知道变成一个被盯着的数。
 */

/** `Bilibili/Dynamic/` 的绝对路径（测试的 cwd 不保证是 packages/core） */
const DYNAMIC_DIR = join(fileURLToPath(new URL('../../src/types/ReturnDataType/Bilibili/Dynamic', import.meta.url)))

/** 已建模变体的全部源码（排除 enum 自己的声明文件，否则会自己命中自己） */
const modeledSource = (): string => {
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (entry.name.endsWith('.ts')) files.push(p)
    }
  }
  walk(DYNAMIC_DIR)
  return files
    .filter((f) => !(basename(f) === 'index.ts' && basename(dirname(f)) === 'Dynamic'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')
}

describe('B站动态：手写 enum 与已建模变体的覆盖率', () => {
  it('两个 enum 的成员数被钉住（加成员而不建模型会在这里红）', () => {
    expect(Object.keys(MajorType)).toHaveLength(17)
    expect(Object.keys(AdditionalType)).toHaveLength(10)
  })

  it('已建模的变体一次都没引用这两个 enum —— 27 个成员是纯声明', () => {
    const source = modeledSource()
    const unusedMajor = Object.keys(MajorType).filter((k) => !source.includes(`MajorType.${k}`))
    const unusedAdditional = Object.keys(AdditionalType).filter((k) => !source.includes(`AdditionalType.${k}`))

    // 这两条断言写成「全部未引用」是**故意**的：它锁的是现状。
    // 哪天有人把 `major.type` 收窄到 `MajorType`，这里会红 —— 那时该改这条断言，
    // 而不是把它删掉当没看见。
    expect(unusedMajor).toHaveLength(17)
    expect(unusedAdditional).toHaveLength(10)
  })

  it('连字面量形式也没有（不是「用了字符串没用 enum」，是真的没用）', () => {
    const source = modeledSource()
    expect(source).not.toMatch(/MAJOR_TYPE_[A-Z_]+/)
    expect(source).not.toMatch(/ADDITIONAL_TYPE_[A-Z_]+/)
  })

  it('顶层判别式那 6 个反而是全覆盖的（缺口只在 major / additional 这两层）', () => {
    const dirs = readdirSync(DYNAMIC_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('DYNAMIC_TYPE_'))
      .map((e) => e.name)
      .sort()

    expect(dirs).toEqual([
      'DYNAMIC_TYPE_ARTICLE',
      'DYNAMIC_TYPE_AV',
      'DYNAMIC_TYPE_DRAW',
      'DYNAMIC_TYPE_FORWARD',
      'DYNAMIC_TYPE_LIVE_RCMD',
      'DYNAMIC_TYPE_WORD'
    ])
  })
})
