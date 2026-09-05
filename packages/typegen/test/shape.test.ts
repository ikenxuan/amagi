/**
 * 形状指纹（`WEB-API-CONSOLE-PRD.md` 3.2 的 `shapeKey`）。
 *
 * 测试的重心全在一条不变式上：**同指纹 ⇒ 渲出来的类型逐字节相同**。那是这个字段的
 * 全部价值，也是它唯一的正确性判据 —— 所以「同形状 → 同指纹」的每一条都顺手把
 * `generateTypes` 的产物也比一遍，光比两个指纹相等是自证。
 *
 * 最要紧的是「录制元数据不影响指纹」那一组：产物文件头里有溯源块（几份样本、参数哈希、
 * 录制日期），把它掺进指纹的话形状相同的两份样本会得出不同指纹，而这个字段就整个失效了 ——
 * 失效的样子是「界面上不再建议合并」，安静得没人会发现。所以那一组里有一条先断言
 * **产物源码真的不一样**，再断言指纹一样：不然它是一条空跑的测试。
 */

import { describe, expect, it } from 'vitest'

import {
  createCorpusSample,
  type CorpusMetadata,
  type CorpusSample,
  type CreateCorpusSampleInput,
  generateTypes,
  type JsonValue,
  planCorpusTypes,
  SHAPE_KEY,
  SHAPE_KEY_PREFIX,
  shapeKeyOfPayloads,
  shapeKeyOfSamples
} from '../src/index'

const RECORDED_AT = new Date('2026-09-01T00:00:00Z')
const NOW = new Date('2026-09-04T00:00:00Z')

/** 一份 `videoInfo` 那种响应。值随便，形状才算数 */
const payload = { code: 0, data: { bvid: 'BV1xx411c7mD', aid: 2, pages: [{ cid: 1, part: 'P1' }] } } satisfies JsonValue

/** 造一份入库样本（走完整流程，同 `plan.test.ts`）。被拒的响应拿不到 sample，那在测试里就是写错了 */
const sample = (overrides: Partial<CreateCorpusSampleInput> = {}): CorpusSample => {
  const result = createCorpusSample({
    platform: 'bilibili',
    endpoint: 'videoInfo',
    params: { bvid: 'BV1xx411c7mD' },
    raw: payload,
    http: { status: 200 },
    amagiVersion: '7.0.0',
    recordedAt: RECORDED_AT,
    ...overrides
  })
  if (!('sample' in result)) throw new Error(`预期入库，实际被拒：${result.verdict.reason}`)
  return result.sample
}

/**
 * 只改 `metadata`，载荷**是同一个对象** —— 于是「元数据不影响指纹」这一组里
 * 没有任何混淆项（改参数再走一遍 `createCorpusSample` 的话，脱敏结果也跟着变了）
 */
const withMetadata = (base: CorpusSample, patch: Partial<CorpusMetadata>): CorpusSample => ({
  ...base,
  metadata: { ...base.metadata, ...patch }
})

/** 这个端点这一轮产出来的全部源码。用来验「产物真的变了 / 真的没变」 */
const generatedFor = (...samples: CorpusSample[]): string =>
  [...planCorpusTypes({ endpoints: [{ platform: 'bilibili', endpoint: 'videoInfo', samples }], now: NOW }).files].join('\n')

describe('同指纹 ⇒ 类型逐字节相同', () => {
  it('两份同形状、值与元素个数都不同的响应得出同一个指纹，而它们渲出来的类型也逐字节相同', () => {
    const other = {
      code: 0,
      data: {
        bvid: 'BV1234567890',
        aid: 99999,
        pages: [
          { cid: 7, part: '第一话' },
          { cid: 8, part: '第二话' }
        ]
      }
    } satisfies JsonValue
    expect(shapeKeyOfPayloads([other])).toBe(shapeKeyOfPayloads([payload]))
    // 不变式的另一半：拿**真实根名**渲一遍，声明也得逐字节相同（指纹用的是常量根名，
    // 而同一个集合文件里两条记录的端点相同 —— 那时根名也相同）
    const render = (value: JsonValue): string => generateTypes([value], { rootName: 'VideoInfo_V0', banner: false }).source
    expect(render(other)).toBe(render(payload))
  })

  it('12 个数据键收成索引签名之后键名不算差异 —— 指纹跟着 `render.ts` 的判据走，没有第二份实现', () => {
    const map = (prefix: string, count: number): JsonValue =>
      Object.fromEntries(Array.from({ length: count }, (_, index) => [`[${prefix}${index}]`, 'https://p.example.com/e.png']))
    // 12 个键（`MAP_MIN_KEYS`）都不像标识符 ⇒ 两边都渲成 `{ [property: string]: string }`
    expect(shapeKeyOfPayloads([{ icons: map('x', 12) }])).toBe(shapeKeyOfPayloads([{ icons: map('e', 12) }]))
    // 差一个键就跌破阈值，逐键展开 ⇒ 真的是另一份类型
    expect(shapeKeyOfPayloads([{ icons: map('e', 11) }])).not.toBe(shapeKeyOfPayloads([{ icons: map('e', 12) }]))
  })
})

describe('录制元数据不影响指纹', () => {
  const base = sample()
  const variants: [string, CorpusSample][] = [
    ['录制日期', withMetadata(base, { recordedAt: '2026-08-14T09:30:00Z' })],
    ['参数哈希', withMetadata(base, { paramsHash: 'ffffffffffff' })],
    ['真参数与脱掉的凭证路径', withMetadata(base, { params: { bvid: 'BV1111111111' }, strippedParams: ['headers.cookie'] })],
    ['amagi 版本', withMetadata(base, { amagiVersion: '6.1.3' })],
    // 不按 verdict 过滤是 `shapeKeyOfSamples` 的明确取舍：错误形状也有形状
    ['入库判定', withMetadata(base, { verdict: { kind: 'store-as-error', reason: 'code=-404 稿件不存在', confident: true } })]
  ]

  for (const [what, variant] of variants) {
    it(`${what}变了，指纹不变`, () => {
      expect(shapeKeyOfSamples([variant])).toBe(shapeKeyOfSamples([base]))
    })
  }

  it('样本份数不影响指纹 —— 同形状的 6 份与 1 份同指纹', () => {
    expect(shapeKeyOfSamples([base, ...variants.map(([, variant]) => variant)])).toBe(shapeKeyOfSamples([base]))
  })

  it('**产物源码确实因为溯源块而不同，指纹却相同** —— 这一条是整个设计最容易悄悄错的地方', () => {
    const later = withMetadata(base, { recordedAt: '2026-08-14T09:30:00Z', paramsHash: 'ffffffffffff' })
    // 前提先钉住：溯源块里有录制日期与参数哈希，所以两份产物本来就不一样。
    // 这条断言一旦失效（比如哪天溯源块不写日期了），下面那条就成了空跑的测试
    expect(generatedFor(later)).not.toBe(generatedFor(base))
    expect(shapeKeyOfSamples([later])).toBe(shapeKeyOfSamples([base]))
  })
})

describe('确定性', () => {
  it('同一份输入跑两次逐字节相同', () => {
    expect(shapeKeyOfPayloads([payload])).toBe(shapeKeyOfPayloads([payload]))
    expect(shapeKeyOfSamples([sample()])).toBe(shapeKeyOfSamples([sample()]))
  })

  it('键序打乱后仍相同 —— 键在渲染时重排，`{a,b}` 与 `{b,a}` 是同一个形状', () => {
    // 走 `JSON.parse` 而不是对象字面量：要的就是「从线上下来的那个键序」
    const straight = JSON.parse('{"code":0,"data":{"aid":2,"bvid":"BV1","pages":[{"cid":1,"part":"P1"}]}}') as JsonValue
    const shuffled = JSON.parse('{"data":{"pages":[{"part":"P1","cid":1}],"bvid":"BV1","aid":2},"code":0}') as JsonValue
    expect(shapeKeyOfPayloads([shuffled])).toBe(shapeKeyOfPayloads([straight]))
  })

  it('零份载荷不抛 —— 零证据下 `unknown` 就是唯一诚实的类型（一个端点所有样本都被拒时会走到这）', () => {
    expect(shapeKeyOfPayloads([])).toMatch(SHAPE_KEY)
    expect(shapeKeyOfSamples([])).toBe(shapeKeyOfPayloads([]))
  })

  it('钉死当前算法的输出值 —— 它一变，盘上那些指纹就全失配了，得跟着 +1 `SHAPE_KEY_VERSION`', () => {
    expect(shapeKeyOfPayloads([payload])).toBe('sk1-5b775da75b8d79ff')
  })
})

describe('真形状差异会改变指纹', () => {
  it('多一个字段', () => {
    const extra = { code: 0, data: { ...payload.data, ttl: 1 } } satisfies JsonValue
    expect(shapeKeyOfPayloads([extra])).not.toBe(shapeKeyOfPayloads([payload]))
  })

  it('类型从 `string` 变 `string | null`', () => {
    // 一份里 `bvid` 是 null ⇒ 合并出 `string | null`。**两边都是 2 份样本**，
    // 于是差异只可能来自类型本身，不来自份数
    const nulled = { code: 0, data: { ...payload.data, bvid: null } } satisfies JsonValue
    expect(shapeKeyOfPayloads([payload, nulled])).not.toBe(shapeKeyOfPayloads([payload, payload]))
  })

  it('可选性变化 —— 只有一份样本有 `aid` ⇒ `aid?`', () => {
    const without = { code: 0, data: { bvid: 'BV1', pages: [{ cid: 1, part: 'P1' }] } } satisfies JsonValue
    expect(shapeKeyOfPayloads([payload, without])).not.toBe(shapeKeyOfPayloads([payload, payload]))
  })
})

describe('写法：与 `sampleHash` 分得开', () => {
  it('指纹带 `sk<版本>-` 前缀，过得了 SHAPE_KEY', () => {
    const key = shapeKeyOfPayloads([payload])
    expect(key).toMatch(SHAPE_KEY)
    expect(key.startsWith(SHAPE_KEY_PREFIX)).toBe(true)
  })

  it('两种哈希互相都过不了对方的判据 —— 混起来的后果是指向另一组参数的样本', () => {
    // 12 位十六进制是 `sampleHash`（`requests.ts` 的 SAMPLE_HASH），PRD 3.2 例子里那个 8 位的也一样
    expect(SHAPE_KEY.test('57c213a5f38c')).toBe(false)
    expect(SHAPE_KEY.test('a1b2c3d4')).toBe(false)
    // 反向：指纹不是一串纯十六进制，不会被当成样本文件名
    expect(/^[0-9a-f]+$/.test(shapeKeyOfPayloads([payload]))).toBe(false)
  })
})
