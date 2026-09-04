/**
 * 参数矩阵（PRD 阶段 1）。
 *
 * 用手写的小 JSON Schema 而不是真端点的 schema：每条只需要证明「这一种 schema 形状
 * 展开成了这几组参数」，坏掉时能一眼看出是哪条规则错了。
 */

import { describe, expect, it } from 'vitest'

import { DEFAULT_MAX_COMBINATIONS, expandParamMatrix, type JsonSchemaLike } from '../src/index'

/** 只取组合清单 */
const combos = (schema: JsonSchemaLike, options?: Parameters<typeof expandParamMatrix>[1]) =>
  expandParamMatrix(schema, options).combinations

describe('能从 schema 穷举的取值', () => {
  it('enum 的每个成员各录一组', () => {
    const schema: JsonSchemaLike = { properties: { order: { enum: ['hot', 'new', 'old'] } }, required: ['order'] }
    expect(combos(schema)).toEqual([{ order: 'hot' }, { order: 'new' }, { order: 'old' }])
  })

  it('const 只有一组', () => {
    expect(combos({ properties: { kpn: { const: 'KUAISHOU' } }, required: ['kpn'] })).toEqual([{ kpn: 'KUAISHOU' }])
  })

  it('boolean 录 true / false 两组 —— 它是唯一能凭 schema 穷举的类型', () => {
    expect(combos({ properties: { hd: { type: 'boolean' } }, required: ['hd'] })).toEqual([{ hd: true }, { hd: false }])
  })

  it('anyOf 分支上的取值也收（zod 的联合摊平成这个形状）', () => {
    const schema: JsonSchemaLike = {
      properties: { type: { anyOf: [{ const: 'video' }, { enum: ['image', 'article'] }] } },
      required: ['type']
    }
    expect(combos(schema)).toEqual([{ type: 'video' }, { type: 'image' }, { type: 'article' }])
  })

  it('取值重复的分支去重', () => {
    const schema: JsonSchemaLike = { properties: { t: { anyOf: [{ const: 'a' }, { enum: ['a', 'b'] }] } }, required: ['t'] }
    expect(combos(schema)).toEqual([{ t: 'a' }, { t: 'b' }])
  })

  it('推不出取值时退回 default', () => {
    expect(combos({ properties: { page: { type: 'number', default: 1 } }, required: ['page'] })).toEqual([{ page: 1 }])
  })

  it('取值太多就截断并说明', () => {
    const schema: JsonSchemaLike = { properties: { n: { enum: [1, 2, 3, 4, 5] } }, required: ['n'] }
    const result = expandParamMatrix(schema, { maxValuesPerParam: 2 })
    expect(result.combinations).toEqual([{ n: 1 }, { n: 2 }])
    expect(result.notes[0]).toContain('只录前 2 个')
  })
})

describe('推不出来的取值：报出来，绝不编', () => {
  it('必填的不透明 ID 没种子 → 一组都不录，进 unseeded', () => {
    const result = expandParamMatrix({ properties: { photoId: { type: 'string' } }, required: ['photoId'] })
    expect(result.combinations).toEqual([])
    expect(result.unseeded).toEqual(['photoId'])
    expect(result.notes.join('\n')).toContain('补种子')
  })

  it('编一个假 ID 只会换回错误页，所以宁可什么都不录 —— 这条是「不猜」的回归测试', () => {
    const result = expandParamMatrix({ properties: { bvid: { type: 'string' }, page: { enum: [1, 2] } }, required: ['bvid', 'page'] })
    // 明明 page 能穷举，但 bvid 缺种子就整个端点录不了，不能只带 page 去发请求
    expect(result.combinations).toEqual([])
  })

  it('给了种子就能录，种子有几个值就录几组', () => {
    const result = expandParamMatrix(
      { properties: { photoId: { type: 'string' } }, required: ['photoId'] },
      { seeds: { photoId: ['3xirtzwrg472nxe', '3xf8k2j9d7q1m4z'] } }
    )
    expect(result.unseeded).toEqual([])
    expect(result.combinations).toEqual([{ photoId: '3xirtzwrg472nxe' }, { photoId: '3xf8k2j9d7q1m4z' }])
  })

  it('种子压过 schema 推出来的取值（`page` 要录第 1 页和第 2 页，只有人知道）', () => {
    const schema: JsonSchemaLike = { properties: { page: { type: 'number', default: 1 } }, required: ['page'] }
    expect(combos(schema, { seeds: { page: [1, 2, 3] } })).toEqual([{ page: 1 }, { page: 2 }, { page: 3 }])
  })

  it('可选又推不出取值 → 只录「不带」，并如实说一声', () => {
    const result = expandParamMatrix({ properties: { keyword: { type: 'string' } } })
    expect(result.combinations).toEqual([{}])
    expect(result.notes.join('\n')).toContain('只录「不带」这一种')
  })
})

describe('可选参数：带与不带都要录（PRD 点名的那条）', () => {
  it('可选参数多出一组「不带」，那个键直接不存在', () => {
    const schema: JsonSchemaLike = { properties: { order: { enum: ['hot', 'new'] } } }
    const result = combos(schema)
    expect(result).toEqual([{ order: 'hot' }, { order: 'new' }, {}])
    expect('order' in result[2]!).toBe(false)
  })

  it('必填参数不会有「不带」那一组', () => {
    expect(combos({ properties: { order: { enum: ['hot'] } }, required: ['order'] })).toEqual([{ order: 'hot' }])
  })

  it('值是 null 与「不带」是两组，不会被去重合并掉', () => {
    const schema: JsonSchemaLike = { properties: { cursor: { enum: [null] } } }
    const result = combos(schema)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ cursor: null })
    expect('cursor' in result[1]!).toBe(false)
  })
})

describe('展开策略', () => {
  const schema: JsonSchemaLike = {
    properties: { a: { enum: ['a1', 'a2', 'a3'] }, b: { enum: ['b1', 'b2'] } },
    required: ['a', 'b']
  }

  it('默认一次只变一个轴：组合数是 1+Σ(kᵢ-1)，不是乘积', () => {
    // 3×2=6 的全交叉 vs 1+(3-1)+(2-1)=4
    expect(combos(schema)).toEqual([
      { a: 'a1', b: 'b1' },
      { a: 'a2', b: 'b1' },
      { a: 'a3', b: 'b1' },
      { a: 'a1', b: 'b2' }
    ])
  })

  it('每个取值仍然至少出现一次（1-wise 覆盖，这是这个策略的全部承诺）', () => {
    const result = combos(schema)
    for (const value of ['a1', 'a2', 'a3']) expect(result.some((item) => item.a === value)).toBe(true)
    for (const value of ['b1', 'b2']) expect(result.some((item) => item.b === value)).toBe(true)
  })

  it('显式要全交叉就给全交叉', () => {
    expect(combos(schema, { strategy: 'cross' })).toHaveLength(6)
  })

  it('全交叉超上限时截断并说明 —— 截断比静默发几百个请求好', () => {
    const wide: JsonSchemaLike = {
      properties: Object.fromEntries(['a', 'b', 'c', 'd'].map((name) => [name, { enum: [1, 2, 3] }])),
      required: ['a', 'b', 'c', 'd']
    }
    const result = expandParamMatrix(wide, { strategy: 'cross' })
    expect(result.combinations).toHaveLength(DEFAULT_MAX_COMBINATIONS)
    expect(result.notes.join('\n')).toContain('超过上限')
  })
})

describe('边界', () => {
  it('没有参数的端点录一组空参数', () => {
    expect(combos({})).toEqual([{}])
    expect(combos({ properties: {} })).toEqual([{}])
  })

  it('确定性：同一份 schema 两次展开结果相同（corpus 文件名由参数派生）', () => {
    const schema: JsonSchemaLike = { properties: { a: { enum: [1, 2] }, b: { type: 'boolean' } }, required: ['a', 'b'] }
    expect(expandParamMatrix(schema)).toEqual(expandParamMatrix(schema))
  })

  it('参数顺序照 schema 的属性顺序，不重排', () => {
    const schema: JsonSchemaLike = { properties: { z: { const: 1 }, a: { const: 2 } }, required: ['z', 'a'] }
    expect(Object.keys(combos(schema)[0]!)).toEqual(['z', 'a'])
  })
})
