import { av2bv, bv2av } from 'amagi/platform/bilibili/sign/bv2av'
/**
 * B站签名 / 编码算法。
 *
 * av2bv / bv2av 是纯函数，可以直接固定值断言 —— v7 重构后输出必须逐字符一致，
 * 否则所有依赖 BV 号转换的下游立刻出错。
 */
import { describe, expect, it } from 'vitest'

describe('av2bv', () => {
  it.each([
    [170001, 'BV17x411w7KC'],
    [1, 'BV1xx411c7mQ'],
    [82599608, 'BV1TJ411G7QA'],
    [2, 'BV1xx411c7mD'],
    [0, 'BV1xx411c7mX']
  ])('av%i -> %s', (aid, bvid) => {
    expect(av2bv(aid)).toBe(bvid)
  })

  it('输出长度恒为 12 且以 BV1 开头', () => {
    for (const aid of [1, 100, 170001, 999999999, 2 ** 31 - 1]) {
      const bv = av2bv(aid)
      expect(bv).toHaveLength(12)
      expect(bv.startsWith('BV1')).toBe(true)
    }
  })

  it('只使用 base58 字符表中的字符', () => {
    const ALPHABET = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf'
    for (const aid of [1, 170001, 82599608, 123456789]) {
      for (const ch of av2bv(aid).slice(3)) {
        expect(ALPHABET.includes(ch), ch + ' 不在字符表中').toBe(true)
      }
    }
  })

  it('相同输入始终得到相同输出', () => {
    expect(av2bv(170001)).toBe(av2bv(170001))
  })

  it('不同输入得到不同输出', () => {
    const seen = new Set<string>()
    for (let aid = 1; aid <= 200; aid++) seen.add(av2bv(aid))
    expect(seen.size).toBe(200)
  })
})

describe('bv2av', () => {
  it.each([
    ['BV17x411w7KC', 170001],
    ['BV1xx411c7mD', 2],
    ['BV1xx411c7mQ', 1],
    ['BV1TJ411G7QA', 82599608]
  ])('%s -> av%i', (bvid, aid) => {
    expect(bv2av(bvid)).toBe(aid)
  })

  it('与 av2bv 互为逆运算', () => {
    for (const aid of [1, 2, 100, 170001, 82599608, 999999999, 1145141919]) {
      expect(bv2av(av2bv(aid))).toBe(aid)
    }
  })

  it('大范围随机抽样往返一致', () => {
    for (let i = 0; i < 500; i++) {
      const aid = 1 + i * 7919
      expect(bv2av(av2bv(aid))).toBe(aid)
    }
  })

  it('不校验输入格式，非法 BV 号返回垃圾值而不抛错', () => {
    expect(() => bv2av('BV1000000000')).not.toThrow()
  })

  it('KNOWN-DEFECT: 传入长度不足的字符串不会报错，只会得到错误结果', () => {
    expect(() => bv2av('BV1')).not.toThrow()
  })
})

describe('av2bv 的边界输入', () => {
  it('aid 为 0 时仍返回 12 位 BV 号', () => {
    expect(av2bv(0)).toHaveLength(12)
  })

  it('极大 aid 不抛错', () => {
    expect(() => av2bv(Number.MAX_SAFE_INTEGER)).not.toThrow()
  })

  it('KNOWN-DEFECT: 小数 aid 会让 BigInt 转换抛错', () => {
    expect(() => av2bv(1.5)).toThrow()
  })
})
