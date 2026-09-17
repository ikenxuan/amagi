/**
 * 破坏性变更检测（PRD 阶段 6）。
 *
 * 测试的重心是**方向**：这些是响应类型，下游主要读它们，所以「加一个联合成员」是破坏性的
 * 而「减一个」不是 —— 这一条直觉上容易反，反了之后门禁会在错误的时候叫、
 * 该叫的时候不叫，比没有门禁更糟。
 */

import { describe, expect, it } from 'vitest'

import { detectBreakingChanges, readGeneratedProps } from '../src/index'

const type = (body: string): string => `export type R = {\n${body}\n  [property: string]: any\n}\n`

const diff = (beforeBody: string, afterBody: string) =>
  detectBreakingChanges(new Map([['a.ts', type(beforeBody)]]), new Map([['a.ts', type(afterBody)]]))

describe('会让下游编译红的改动', () => {
  it('删属性', () => {
    const changes = diff('  a: number\n  b: string', '  a: number')
    expect(changes).toMatchObject([{ kind: 'prop-removed', prop: 'b', breaksReaders: true }])
  })

  it('必需变可选', () => {
    expect(diff('  a: number', '  a?: number')).toMatchObject([{ kind: 'prop-now-optional', breaksReaders: true }])
  })

  it('联合里加成员（`string` → `string | null`）—— 多出来的情况下游得处理', () => {
    const changes = diff('  a: string', '  a: string | null')
    expect(changes).toMatchObject([{ kind: 'union-member-added', breaksReaders: true }])
    expect(changes[0]!.message).toContain('null')
  })

  it('类型整个换掉', () => {
    expect(diff('  a: number', '  a: string')).toMatchObject([{ kind: 'type-changed', breaksReaders: true }])
  })

  it('整个类型没了', () => {
    const changes = detectBreakingChanges(new Map([['a.ts', type('  a: number')]]), new Map())
    expect(changes).toMatchObject([{ kind: 'type-removed', breaksReaders: true }])
    expect(changes[0]!.message).toContain('import 它的地方会直接红')
  })

  it('同一个文件里少了一个子类型', () => {
    const before = 'export type R = {\n  a: A\n}\n\ntype A = {\n  x: number\n}\n'
    const after = 'export type R = {\n  a: number\n}\n'
    const changes = detectBreakingChanges(new Map([['a.ts', before]]), new Map([['a.ts', after]]))
    // 排序键是 文件/类型/属性/种类，`A` 排在 `R` 前面
    expect(changes.map((change) => change.kind)).toEqual(['type-removed', 'type-changed'])
  })
})

describe('不会让下游编译红、但仍然值得报的改动', () => {
  it('联合里少成员（`string | number` → `string`）：读的一侧安全，但很可能是没录到', () => {
    const changes = diff('  a: string | number', '  a: string')
    expect(changes).toMatchObject([{ kind: 'union-member-removed', breaksReaders: false }])
    expect(changes[0]!.message).toContain('没录到')
  })

  it('可选变必需不报（值少了一种，读的一侧只会更轻松）', () => {
    expect(diff('  a?: number', '  a: number')).toEqual([])
  })

  it('加属性不报 —— 索引签名那条承诺就是「平台加字段不算 breaking」', () => {
    expect(diff('  a: number', '  a: number\n  b: string')).toEqual([])
  })

  it('一个字没改就一条都不报', () => {
    expect(diff('  a: number\n  b?: string | null', '  a: number\n  b?: string | null')).toEqual([])
  })
})

describe('解析生成的源码', () => {
  it('按类型分组抽属性，索引签名不算属性', () => {
    const types = readGeneratedProps('export type R = {\n  a: number\n  [property: string]: any\n}\n')
    expect([...types.keys()]).toEqual(['R'])
    expect([...types.get('R')!.keys()]).toEqual(['a'])
  })

  it('带引号的键名去掉引号（B站真有 `background-color` 这种键）', () => {
    const types = readGeneratedProps("export type R = {\n  'background-color': string\n}\n")
    expect([...types.get('R')!.keys()]).toEqual(['background-color'])
  })

  it('未导出的子类型也收', () => {
    const types = readGeneratedProps('export type R = {\n  a: A\n}\n\ntype A = {\n  x: number\n}\n')
    expect([...types.keys()]).toEqual(['R', 'A'])
  })

  it('括号里的 `|` 不当成这一层的联合（`(A | B)[]` 是元素类型的联合）', () => {
    // 拆错的话「元素类型变了」会被报成「这一层少了一个联合成员」
    expect(diff('  a: (A | B)[]', '  a: (A | B)[]')).toEqual([])
    expect(diff('  a: (A | B)[]', '  a: A[]')).toMatchObject([{ kind: 'type-changed' }])
  })
})

describe('确定性（清单要进 CI summary）', () => {
  it('按 文件 / 类型 / 属性 / 种类 排序', () => {
    const before = new Map([
      ['b.ts', type('  z: number\n  a: number')],
      ['a.ts', type('  q: number')]
    ])
    const after = new Map([
      ['b.ts', type('  z: string')],
      ['a.ts', type('')]
    ])
    const keys = detectBreakingChanges(before, after).map((change) => `${change.file}|${change.prop}`)
    expect(keys).toEqual([...keys].sort())
  })
})
