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
 * 数出来的账分两笔，别混：
 *
 * 1. **amagi 内部：27 个成员被已建模的类型引用 0 次。** 既没有 `MajorType.ARCHIVE`
 *    这样的引用，也没有 `'MAJOR_TYPE_ARCHIVE'` 这样的字面量；两个 enum 在 `src/` 里
 *    除了自己的声明文件之外没有任何 import。而它们本该描述的
 *    `modules.module_dynamic.major.type` 类型是裸 `string`。
 * 2. **下游确实在用 `MajorType`。** 实测 `karin-plugin-kkk` 里用到 3 个成员
 *    （`LIVE_RCMD` ×2、`OPUS`、`DRAW`），集中在一个文件。所以这个 enum **不是死代码**，
 *    它是给消费方按动态类型分支用的 —— 只是 amagi 自己的类型声明没接上它。
 *    `AdditionalType` 则是 amagi 与下游**都零引用**，那 10 个成员才是真正的删除候选。
 *
 * 所以「删还是留」有了不同的答案：`MajorType` **必须留**（删了下游立刻红），
 * `AdditionalType` 要等样本证明线上到底有没有这些取值。而「把 `major.type` 收窄到
 * `MajorType`」两者都得先有样本 —— 收窄会拒绝平台返回的新取值，与索引签名那条
 * 「平台加字段不算 breaking」的承诺冲突。
 *
 * 这个文件**不修**任何一边，只把账记住：数字一变就会红，于是「缺口有多大」
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

  it('已建模的变体一次都没引用这两个 enum —— amagi 自己的类型没接上它们', () => {
    const source = modeledSource()
    const unusedMajor = Object.keys(MajorType).filter((k) => !source.includes(`MajorType.${k}`))
    const unusedAdditional = Object.keys(AdditionalType).filter((k) => !source.includes(`AdditionalType.${k}`))

    // 这两条断言写成「全部未引用」是**故意**的：它锁的是现状。
    // 哪天有人把 `major.type` 收窄到 `MajorType`，这里会红 —— 那时该改这条断言，
    // 而不是把它删掉当没看见。
    // 注意作用域：这里只数 amagi 的 `Dynamic/` 树。下游（kkk）确实在用 `MajorType`
    // 的 3 个成员，所以「未被引用」≠「死代码」，见文件头那两笔账。
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
