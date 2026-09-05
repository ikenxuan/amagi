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

/**
 * 同一份选项下，截断前后生成的源码必须一致。
 *
 * `literalPaths` 必须**两边都传**：同一份路径列表同时决定「渲染时哪些位置收窄成字面量联合」
 * 与「截断时哪些位置把取值算进形状签名」。只传给 `generateTypes` 而没传给 `trimSample`
 * 正是下面「字面量收窄的位置」那一组用例要钉住的 bug。
 */
const sameTypes = (value: JsonValue, literalPaths?: readonly (string | RegExp)[]): void => {
  const literals = literalPaths === undefined ? {} : { literalPaths }
  const options = { rootName: 'R', banner: false as const, ...literals }
  expect(generateTypes([trimSample(value, literals).value], options).source).toBe(generateTypes([value], options).source)
}

/** 渲染一遍，用来断言产物里确实有那条联合 —— 免得 `sameTypes` 在「两边都没收窄」时空过 */
const sourceOf = (value: JsonValue, literalPaths: readonly (string | RegExp)[]): string =>
  generateTypes([value], { rootName: 'R', banner: false, literalPaths }).source

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

/**
 * 字面量收窄的位置：**取值本身也是形状的一部分**。
 *
 * 这一组是「类型一字不变」在 `literalPaths` 下的同一条性质。单独分一个 describe 是因为
 * 上面那一组从头到尾没传过 `literalPaths` —— 而 `emit.ts` 产判别联合时是**无条件**
 * 把判别式路径塞进 `literalPaths` 的，所以「命中的位置上取值会不会被截掉」不是边角情形。
 */
describe('字面量收窄的位置：取值也算一种形状', () => {
  /** 判别式落在数组元素上：`list[].type` */
  const TYPE_PATH: readonly (string | RegExp)[] = [/list\[\]\.type$/]

  it('五种取值截不掉 —— 不然联合从五元掉成三元', () => {
    const value: JsonValue = { list: Array.from({ length: 5 }, (_, index): JsonValue => ({ type: `T${index}` })) }
    sameTypes(value, TYPE_PATH)
    // 断言产物里真有那条五元联合：否则「两边都渲染成 string」也能让 sameTypes 空过
    expect(sourceOf(value, TYPE_PATH)).toContain("type: 'T0' | 'T1' | 'T2' | 'T3' | 'T4'")
  })

  it('第 50 条才出现的取值 → 它被留下来，联合里还有它', () => {
    const items: JsonValue[] = Array.from({ length: 60 }, (_, index): JsonValue => ({ type: index === 50 ? 'RARE' : 'COMMON' }))
    const value: JsonValue = { list: items }
    const kept = (trimSample(value, { literalPaths: TYPE_PATH }).value as { list: Record<string, JsonValue>[] }).list
    expect(kept).toHaveLength(4)
    sameTypes(value, TYPE_PATH)
    expect(sourceOf(value, TYPE_PATH)).toContain("type: 'COMMON' | 'RARE'")
  })

  it('取值多到 merge 放弃收窄（> maxLiterals）时也相同 —— 全部留下，两边一起放宽成 string', () => {
    const value: JsonValue = { list: Array.from({ length: 40 }, (_, index): JsonValue => ({ type: `T${index}` })) }
    // 留全部取值，不去照抄 merge 那边的放弃阈值：理由见 trim.ts 里 `signatureOf` 的注释
    expect((trimSample(value, { literalPaths: TYPE_PATH }).value as { list: unknown[] }).list).toHaveLength(40)
    sameTypes(value, TYPE_PATH)
    expect(sourceOf(value, TYPE_PATH)).toContain('type: string')
  })

  it('命中路径埋在两层数组底下也保得住', () => {
    const paths: readonly (string | RegExp)[] = [/pages\[\]\.items\[\]\.type$/]
    const pages: JsonValue[] = Array.from(
      { length: 10 },
      (_, page): JsonValue => ({
        items: Array.from({ length: 20 }, (_, index): JsonValue => ({ type: page === 9 && index === 19 ? 'RARE' : 'COMMON' }))
      })
    )
    sameTypes({ pages }, paths)
    expect(sourceOf({ pages }, paths)).toContain("type: 'COMMON' | 'RARE'")
  })

  it('字符串精确匹配的写法一样管用（不是只认 RegExp）', () => {
    const value: JsonValue = { list: Array.from({ length: 30 }, (_, index): JsonValue => ({ type: index < 15 ? 'A' : 'B' })) }
    sameTypes(value, ['list[].type'])
    expect(sourceOf(value, ['list[].type'])).toContain("type: 'A' | 'B'")
  })

  it('数字与布尔的取值同样算形状', () => {
    const codes: JsonValue = { list: Array.from({ length: 30 }, (_, index): JsonValue => ({ type: index === 29 ? 404 : 0 })) }
    sameTypes(codes, TYPE_PATH)
    expect(sourceOf(codes, TYPE_PATH)).toContain('type: 0 | 404')
    const flags: JsonValue = { list: Array.from({ length: 30 }, (_, index): JsonValue => ({ type: index === 29 })) }
    sameTypes(flags, TYPE_PATH)
    expect(sourceOf(flags, TYPE_PATH)).toContain('type: false | true')
  })

  it('**只有**命中的位置算取值：同取值的 100 条照旧截到 3 条', () => {
    // 截断存在的理由就在这条：一份 danmakuList 204 KB → 4 KB。把取值一律算进签名的话，
    // 100 条各不相同的 `text` 会让这里一条都截不掉
    const value: JsonValue = {
      list: Array.from({ length: 100 }, (_, index): JsonValue => ({ type: index % 2 === 0 ? 'A' : 'B', text: `t${index}`, id: index }))
    }
    const { value: trimmedValue, trimmed } = trimSample(value, { literalPaths: TYPE_PATH })
    expect((trimmedValue as { list: unknown[] }).list).toHaveLength(3)
    expect(trimmed).toEqual([{ path: 'list', from: 100, to: 3 }])
    sameTypes(value, TYPE_PATH)
  })

  it('不传 literalPaths 就是原来的行为：取值不算形状', () => {
    const value: JsonValue = { list: Array.from({ length: 100 }, (_, index): JsonValue => ({ type: `T${index}` })) }
    expect((trimSample(value).value as { list: unknown[] }).list).toHaveLength(3)
  })

  it('同一份样本截两遍逐字节相同（确定性）', () => {
    const value: JsonValue = {
      list: Array.from({ length: 50 }, (_, index): JsonValue => ({ type: `T${index % 7}`, text: `t${index}` }))
    }
    const once = JSON.stringify(trimSample(value, { literalPaths: TYPE_PATH }).value)
    expect(JSON.stringify(trimSample(value, { literalPaths: TYPE_PATH }).value)).toBe(once)
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
