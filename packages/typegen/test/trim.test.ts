/**
 * 按形状截断数组（corpus 瘦身）。
 *
 * 这一组测试只有一条真正重要：**截断前后生成的类型逐字节相同**。
 * 其余都是它的支撑 —— 哪种元素必须留下来才能保住那条性质。
 */

import { describe, expect, it } from 'vitest'

import { DEFAULT_MAX_ELEMENTS, generateTypes, type JsonValue, trimSample } from '../src/index'

const trim = (value: JsonValue, maxElements?: number): JsonValue =>
  trimSample(value, maxElements === undefined ? {} : { maxElements }).value

/** 同一份选项下，截断前后生成的源码必须一致 */
const sameTypes = (value: JsonValue): void => {
  const options = { rootName: 'R', banner: false as const }
  expect(generateTypes([trim(value)], options).source).toBe(generateTypes([value], options).source)
}

describe('核心性质：类型一字不变', () => {
  it('100 条同形元素截到 3 条，类型不变', () => {
    const value: JsonValue = { list: Array.from({ length: 100 }, (_, index) => ({ id: index, name: `n${index}` })) }
    expect((trim(value) as { list: unknown[] }).list).toHaveLength(3)
    sameTypes(value)
  })

  it('第 50 条多一个键 → 它被留下来，`?:` 还在', () => {
    const items: JsonValue[] = Array.from({ length: 60 }, (_, index): JsonValue => (index === 50 ? { a: 1, extra: 'x' } : { a: 1 }))
    const value: JsonValue = { list: items }
    const kept = (trim(value) as { list: Record<string, JsonValue>[] }).list
    expect(kept).toHaveLength(4)
    expect(kept.some((item) => 'extra' in item)).toBe(true)
    sameTypes(value)
    expect(generateTypes([trim(value)], { rootName: 'R', banner: false }).source).toContain('extra?: string')
  })

  it('第 50 条某个键是 null → 也留下来，`| null` 还在', () => {
    const items: JsonValue[] = Array.from({ length: 60 }, (_, index) => ({ a: index === 50 ? null : 1 }))
    sameTypes({ list: items })
    expect(generateTypes([trim({ list: items })], { rootName: 'R', banner: false }).source).toContain('a: number | null')
  })

  it('第 50 条的同名键换了原始类型 → 联合还在', () => {
    const items: JsonValue[] = Array.from({ length: 60 }, (_, index) => ({ code: index === 50 ? '12061' : -412 }))
    sameTypes({ list: items })
  })

  it('超出 MAX_SAFE_INTEGER 的整数单独算一种形状 —— 不然 unsafe-integer 那条报告项会被截掉', () => {
    // oxlint-disable-next-line no-loss-of-precision
    const items: JsonValue[] = Array.from({ length: 60 }, (_, index) => ({ id: index === 50 ? 9007199254740993 : 1 }))
    const value: JsonValue = { list: items }
    expect(generateTypes([trim(value)], { banner: false }).report.findings.some((f) => f.kind === 'unsafe-integer')).toBe(true)
    sameTypes(value)
  })

  it('嵌套数组逐层截，深处的异形元素也留得住', () => {
    const pages: JsonValue[] = Array.from(
      { length: 10 },
      (_, page): JsonValue => ({
        items: Array.from({ length: 30 }, (_, index): JsonValue => (page === 9 && index === 29 ? { a: 1, deep: true } : { a: 1 }))
      })
    )
    sameTypes({ pages })
  })

  it('空数组与非空数组是两种形状，不会被合并掉', () => {
    const items: JsonValue[] = Array.from({ length: 10 }, (_, index) => ({ xs: index === 9 ? [] : [1] }))
    sameTypes({ items })
  })
})

describe('截断记录', () => {
  it('报出哪条路径从几条截到几条', () => {
    const { trimmed } = trimSample({ list: Array.from({ length: 10 }, () => ({ a: 1 })) })
    expect(trimmed).toEqual([{ path: 'list', from: 10, to: 3 }])
  })

  it('没截就没有记录', () => {
    expect(trimSample({ list: [{ a: 1 }] }).trimmed).toEqual([])
  })

  it('多处截断按路径排序（确定性）', () => {
    const value: JsonValue = { z: Array.from({ length: 5 }, () => 1), a: Array.from({ length: 5 }, () => 1) }
    expect(trimSample(value).trimmed.map((item) => item.path)).toEqual(['a', 'z'])
  })

  it('默认留 3 条', () => {
    expect(DEFAULT_MAX_ELEMENTS).toBe(3)
    expect((trim({ list: [1, 1, 1, 1, 1] }) as { list: unknown[] }).list).toHaveLength(3)
  })

  it('上限可调', () => {
    expect((trim({ list: [1, 1, 1, 1, 1] }, 1) as { list: unknown[] }).list).toHaveLength(1)
  })
})

describe('纯函数性质', () => {
  it('不改输入', () => {
    const value = { list: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }] } satisfies JsonValue
    const before = JSON.stringify(value)
    trimSample(value)
    expect(JSON.stringify(value)).toBe(before)
  })

  it('键序不变', () => {
    expect(Object.keys(trim({ z: 1, a: 2 }) as Record<string, JsonValue>)).toEqual(['z', 'a'])
  })

  it('根是数组也能截', () => {
    expect(trim(Array.from({ length: 10 }, () => 1))).toHaveLength(3)
  })

  it('原始类型的数组按类型算形状（数字与字符串两种都留）', () => {
    expect(trim({ xs: [1, 1, 1, 1, 'a'] }, 2)).toEqual({ xs: [1, 1, 'a'] })
  })
})
