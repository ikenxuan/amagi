/**
 * 「五、类型合并算法」那张规则表 —— **一行一个 describe**，顺序与 PRD 表格一致。
 *
 * 用小样本而不是真响应：每条规则只需要证明「这一条按表里写的处理了」，
 * 小样本坏掉时能一眼看出是哪条规则错了。真响应那种规模的用例是
 * `forward-fake-variants.test.ts`。
 */

import { describe, expect, it } from 'vitest'

import { GENERATED_BANNER, type GenerateOptions, generateTypes, type JsonValue } from '../src/index'

const source = (samples: JsonValue[], options: GenerateOptions = {}): string =>
  generateTypes(samples, { rootName: 'R', banner: false, ...options }).source

/** 在产出的源码里找某个键那一行（已 trim）—— 断言「必需/可选 + 类型」最省事。键名在小样本里唯一，不会撞 */
const propLine = (samples: JsonValue[], key: string, options?: GenerateOptions): string => {
  const found = source(samples, options)
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${key}:`) || line.startsWith(`${key}?:`))
  if (found === undefined) throw new Error(`生成结果里没有键 ${key}`)
  return found
}

describe('规则：键在全部样本里都有 → 必需', () => {
  it('两份样本都有 a', () => {
    expect(source([{ a: 1 }, { a: 2 }])).toBe(['export type R = {', '  a: number', '  [property: string]: any', '}', ''].join('\n'))
  })
})

describe('规则：键只在部分样本里有 → `?:`', () => {
  it('第二份没有 a', () => {
    expect(propLine([{ a: 1 }, {}], 'a')).toBe('a?: number')
  })

  it('嵌套层同理，分母是「这一层见过多少个对象」而不是样本数', () => {
    // b 这一层只出现过 1 次，它里面的 c 对这一层来说是「全都有」，所以必需
    expect(propLine([{ b: { c: 1 } }, {}], 'b')).toBe('b?: B')
    expect(propLine([{ b: { c: 1 } }, {}], 'c')).toBe('c: number')
  })
})

describe('规则：键存在但值为 null → `| null`，且**与可选分开记**', () => {
  // 这是规则表点名「最容易偷懒合并掉」的一条：JSON 分不出「缺键」和「键为 null」，
  // 两个维度必须各记一份。下面 6 条把 2×3 的组合全钉死。
  it('都有值 → 必需，不带 null', () => {
    expect(propLine([{ a: 1 }, { a: 2 }], 'a')).toBe('a: number')
  })

  it('缺键 → 只可选', () => {
    expect(propLine([{ a: 1 }, {}], 'a')).toBe('a?: number')
  })

  it('值为 null → 只加 null，**不变可选**', () => {
    expect(propLine([{ a: 1 }, { a: null }], 'a')).toBe('a: number | null')
  })

  it('既缺过键又出现过 null → 可选**且**可为 null', () => {
    expect(propLine([{ a: 1 }, { a: null }, {}], 'a')).toBe('a?: number | null')
  })

  it('恒为 null → 类型就是 null（必需）', () => {
    expect(propLine([{ a: null }, { a: null }], 'a')).toBe('a: null')
  })

  it('只见过 null 且缺过键 → `?: null`', () => {
    expect(propLine([{ a: null }, {}], 'a')).toBe('a?: null')
  })
})

describe('规则：同名键在不同样本里是不同原始类型 → 联合', () => {
  it('业务码有的给 -412、有的给 "12061"', () => {
    expect(propLine([{ code: -412 }, { code: '12061' }], 'code')).toBe('code: string | number')
  })

  it('顺带产一条 mixed-primitives 报告项（告知性质，不用人决策）', () => {
    const { report } = generateTypes([{ code: -412 }, { code: '12061' }], { banner: false })
    const mixed = report.findings.find((finding) => finding.kind === 'mixed-primitives')
    expect(mixed).toMatchObject({ path: 'code', types: ['string', 'number'], needsDecision: false })
  })
})

describe('规则：数组为空 → 从其他样本补元素形状；全空则 `unknown[]`', () => {
  it('一份空一份有 → 用有的那份的元素形状', () => {
    expect(propLine([{ items: [] }, { items: [{ id: 1 }] }], 'items')).toBe('items: Item[]')
    expect(propLine([{ items: [] }, { items: [{ id: 1 }] }], 'id')).toBe('id: number')
  })

  it('全空 → `unknown[]`，并且报出来（要补样本，得人决策）', () => {
    expect(propLine([{ items: [] }, { items: [] }], 'items')).toBe('items: unknown[]')
    const { report } = generateTypes([{ items: [] }, { items: [] }], { banner: false })
    expect(report.findings).toMatchObject([{ kind: 'empty-array', path: 'items', arrays: 2, needsDecision: true }])
  })
})

describe('规则：数组元素形状不一致 → 元素类型取联合', () => {
  it('原始类型不一致 → `(string | number)[]`（联合当元素要括起来）', () => {
    expect(propLine([{ xs: [1, 'a'] }], 'xs')).toBe('xs: (string | number)[]')
  })

  it('原始类型与对象混在一起 → 对象也进联合', () => {
    expect(propLine([{ xs: [{ a: 1 }, 2] }], 'xs')).toBe('xs: (X | number)[]')
  })

  it('对象元素形状不一致 → 合并成一个对象、各键可选（判别联合是 5.1，还没做）', () => {
    expect(propLine([{ xs: [{ a: 1 }, { b: 2 }] }], 'a')).toBe('a?: number')
    expect(propLine([{ xs: [{ a: 1 }, { b: 2 }] }], 'b')).toBe('b?: number')
  })
})

describe('规则：某字段在所有样本里恒为同一字面量 → 默认放宽，只有白名单才收窄', () => {
  it('默认放宽成基础类型（单账号采样会让 userId 恒等于一个值，收窄是错的）', () => {
    expect(propLine([{ userId: '4098' }, { userId: '4098' }], 'userId')).toBe('userId: string')
  })

  it('白名单命中才收窄，路径精确匹配', () => {
    expect(propLine([{ type: 'A' }, { type: 'A' }], 'type', { literalPaths: ['type'] })).toBe("type: 'A'")
    // 同名但路径不同的键不受影响
    expect(propLine([{ nested: { type: 'A' } }], 'type', { literalPaths: ['type'] })).toBe('type: string')
    expect(propLine([{ nested: { type: 'A' } }], 'type', { literalPaths: ['nested.type'] })).toBe("type: 'A'")
  })

  it('白名单命中且有多个取值 → 字面量联合，顺序固定（确定性）', () => {
    const samples = [{ type: 'B' }, { type: 'A' }, { type: 'A' }]
    expect(propLine(samples, 'type', { literalPaths: [/type$/] })).toBe("type: 'A' | 'B'")
  })

  it('取值太多就放弃收窄，哪怕在白名单里', () => {
    const samples = Array.from({ length: 5 }, (_, index) => ({ id: `x${index}` }))
    expect(propLine(samples, 'id', { literalPaths: ['id'], maxLiterals: 3 })).toBe('id: string')
  })

  it('报告只报「像枚举 token」的常量 —— 否则两份样本能刷出上百条噪音', () => {
    const { report } = generateTypes(
      [
        { userId: '4098', type: 'AUTHOR_TYPE_NORMAL' },
        { userId: '4098', type: 'AUTHOR_TYPE_NORMAL' }
      ],
      { banner: false }
    )
    expect(report.findings.map((finding) => finding.path)).toEqual(['type'])
    expect(report.findings[0]).toMatchObject({
      kind: 'literal-widened',
      literal: 'AUTHOR_TYPE_NORMAL',
      occurrences: 2,
      needsDecision: false
    })
  })
})

describe('规则：数字像 ID 且超过 Number.MAX_SAFE_INTEGER → 标注出来让人决策', () => {
  // 下面两处 oxlint 的 no-loss-of-precision 警告是**故意**的：字面量在运行时就会丢精度，
  // 而「丢精度」正是被测对象 —— 快手 / B站的 ID 落进 JSON.parse 时就是这个下场
  it('不静默处理：类型仍是 number，但报一条 needsDecision 的项', () => {
    // oxlint-disable-next-line no-loss-of-precision
    const samples = [{ photo_id: 9007199254740993 }] satisfies JsonValue[]
    expect(propLine(samples, 'photo_id')).toBe('photo_id: number')
    const { report } = generateTypes(samples, { banner: false })
    expect(report.findings).toMatchObject([{ kind: 'unsafe-integer', path: 'photo_id', needsDecision: true, looksLikeId: true }])
    // 报告里得说清「精度在 JSON.parse 时就丢了」，否则会被当成能自动修的事
    expect(report.findings[0]!.message).toContain('JSON.parse')
  })

  it('安全范围内的数字不报', () => {
    const { report } = generateTypes([{ count: 12345 }], { banner: false })
    expect(report.findings).toEqual([])
  })

  it('键名不像 ID 也照样报（looksLikeId 只是提示，不是报不报的开关）', () => {
    // oxlint-disable-next-line no-loss-of-precision
    const { report } = generateTypes([{ total: 12345678901234567890 }], { banner: false })
    expect(report.findings).toMatchObject([{ kind: 'unsafe-integer', needsDecision: true, looksLikeId: false }])
  })
})

describe('硬约束 1：每一层都输出 `[property: string]: any`', () => {
  it('嵌套三层，三层都有；空对象内联也有', () => {
    const generated = source([{ a: { b: { c: 1 } }, empty: {} }])
    expect(generated.match(/\[property: string\]: any/g)).toHaveLength(4)
    expect(generated).toContain('empty: { [property: string]: any }')
  })

  it('数组元素那一层也有', () => {
    expect(source([{ xs: [{ a: 1 }] }]).match(/\[property: string\]: any/g)).toHaveLength(2)
  })
})

describe('硬约束 / 5.2：结构等价的子树复用已生成的类型', () => {
  it('两个键的子树一样 → 只产一个类型，第二个直接引用', () => {
    const { source: generated, typeNames } = generateTypes([{ a: { x: 1 }, b: { x: 1 } }], { rootName: 'R', banner: false })
    expect(typeNames).toEqual(['R', 'A'])
    expect(generated).toContain('  a: A')
    expect(generated).toContain('  b: A')
  })

  it('只差一个键就不算等价，各产一个（名字撞了补数字后缀）', () => {
    const { typeNames } = generateTypes([{ a: { x: 1 }, b: { x: 1, y: 2 } }], { rootName: 'R', banner: false })
    expect(typeNames).toEqual(['R', 'A', 'B'])
  })

  it('可选性也算进等价判定 —— 渲染出来不一样就不能共用', () => {
    const { typeNames } = generateTypes([{ a: { x: 1 }, b: { x: 1 } }, { b: {} }], { rootName: 'R', banner: false })
    expect(typeNames).toEqual(['R', 'A', 'B'])
  })
})

describe('文件头与报告', () => {
  it('默认带文件头，且写明 `_V<n>` 不是版本号（否则下一个人一定理解错）', () => {
    const { source: generated } = generateTypes([{ a: 1 }], { rootName: 'R' })
    expect(generated.startsWith(GENERATED_BANNER)).toBe(true)
    expect(GENERATED_BANNER).toContain('自动生成，手改无意义')
    expect(GENERATED_BANNER).toContain('不是 API 版本号')
  })

  it('如实报出没做的部分：元素级判别联合、次级判别式子目录、落盘脚本', () => {
    const { report } = generateTypes([{ a: 1 }], { banner: false })
    const notes = report.notImplemented.join('\n')
    // 判别式发现、`is*` 守卫、注释 sidecar 都已经做了（见 discriminant.test.ts / docs.test.ts），
    // 所以不该再出现在这里 —— 报告说谎比没有报告更糟
    expect(notes).not.toContain('判别式发现能不能做')
    expect(notes).not.toContain('手写语义 sidecar')
    // 还没做的：数组元素级的判别联合、次级判别式子目录、以及写盘 / `--check`
    expect(notes).toContain('元素级')
    expect(notes).toContain('gen:types')
  })
})

describe('杂项：纯函数该有的性质', () => {
  it('样本顺序不影响产出（产物要提交进 git 跑 --check）', () => {
    const a = source([{ a: 1 }, { b: 'x' }, { a: null }])
    const b = source([{ a: null }, { a: 1 }, { b: 'x' }])
    expect(a).toBe(b)
  })

  it('不改输入样本', () => {
    const sample = { a: 1, b: { c: [1, 2] } } satisfies JsonValue
    const before = JSON.stringify(sample)
    source([sample])
    expect(JSON.stringify(sample)).toBe(before)
  })

  it('零份样本不炸，产出一个空壳（corpus 还没录时的退化情形）', () => {
    expect(source([])).toBe(['export type R = unknown', ''].join('\n'))
  })

  it('根不是对象也能渲染', () => {
    expect(source([[{ a: 1 }]])).toContain('export type R = ')
  })

  it('键名不是合法标识符时加引号', () => {
    expect(source([{ 'background-color': 'red' }])).toContain("  'background-color': string")
  })
})
