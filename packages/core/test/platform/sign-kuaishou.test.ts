import {
  buildKuaishouHxfalconPayload,
  buildKuaishouHxfalconSignInput,
  bytesToLowerHex,
  computeKuaishouLrcHex,
  deriveKuaishouB2has,
  deriveKuaishouB2sa,
  deriveKuaishouCts,
  deriveKuaishouKww,
  hexToSignedBytes,
  kuaishouSign,
  toLittleEndianHex,
  transformKuaishouHeHex,
  xorByteArrays
} from 'amagi/platform/kuaishou/sign'
/**
 * 快手签名的纯原语。
 *
 * 这些函数是逆向出来的字节运算，没有任何注释能替代固定值断言 ——
 * v7 若在重构中改写它们，输出必须逐字节一致。
 */
import { describe, expect, it } from 'vitest'

import { freezeEntropy } from '../helpers/deterministic'

// buildKuaishouHxfalconPayload 要求 URL 上必须带 caver 参数
const LIVE_API_URL = 'https://live.kuaishou.com/live_api/baseuser/userinfo/byid?caver=2&principalId=pid1'

describe('bytesToLowerHex', () => {
  it.each([
    [[0], '00'],
    [[255], 'ff'],
    [[15], '0f'],
    [[1, 2, 3], '010203'],
    [[-1], 'ff'],
    [[-128], '80']
  ])('%j -> %s', (bytes, hex) => {
    expect(bytesToLowerHex(bytes)).toBe(hex)
  })

  it('空输入返回空字符串', () => {
    expect(bytesToLowerHex([])).toBe('')
  })

  it('接受 Int8Array', () => {
    expect(bytesToLowerHex(new Int8Array([1, -1]))).toBe('01ff')
  })

  it('输出始终是偶数长度的小写十六进制', () => {
    const hex = bytesToLowerHex([0, 1, 127, 128, 255])
    expect(hex).toMatch(/^[0-9a-f]+$/)
    expect(hex.length % 2).toBe(0)
  })
})

describe('hexToSignedBytes', () => {
  it.each([
    ['00', [0]],
    ['ff', [-1]],
    ['80', [-128]],
    ['7f', [127]],
    ['010203', [1, 2, 3]]
  ])('%s -> %j', (hex, bytes) => {
    expect(hexToSignedBytes(hex)).toEqual(bytes)
  })

  it('与 bytesToLowerHex 互为逆运算', () => {
    const hex = '00017f80ff'
    expect(bytesToLowerHex(hexToSignedBytes(hex))).toBe(hex)
  })

  it('空字符串返回空数组', () => {
    expect(hexToSignedBytes('')).toEqual([])
  })

  it('大写十六进制同样可解析', () => {
    expect(hexToSignedBytes('FF')).toEqual([-1])
  })
})

describe('xorByteArrays', () => {
  it('逐字节异或', () => {
    expect(Array.from(xorByteArrays([1, 2, 3], [1, 2, 3]))).toEqual([0, 0, 0])
    expect(Array.from(xorByteArrays([0xff], [0x0f]))).toEqual([-16])
  })

  it('右侧较短时循环取用', () => {
    expect(Array.from(xorByteArrays([1, 1, 1, 1], [1]))).toEqual([0, 0, 0, 0])
  })

  it('输出长度等于左侧长度', () => {
    expect(xorByteArrays([1, 2, 3, 4, 5], [1, 2])).toHaveLength(5)
  })

  it('与全 0 异或得到原值', () => {
    expect(Array.from(xorByteArrays([5, 6, 7], [0]))).toEqual([5, 6, 7])
  })
})

describe('toLittleEndianHex', () => {
  it.each([
    [0, 1, '00'],
    [1, 1, '01'],
    [255, 1, 'ff'],
    [256, 2, '0001'],
    [1, 4, '01000000'],
    [0x12345678, 4, '78563412']
  ])('value=%s size=%i -> %s', (value, size, hex) => {
    expect(toLittleEndianHex(value, size)).toBe(hex)
  })

  it('接受 bigint', () => {
    expect(toLittleEndianHex(1n, 2)).toBe('0100')
  })

  it('超出位宽时按无符号截断', () => {
    expect(toLittleEndianHex(0x1ff, 1)).toBe('ff')
  })

  it('负数按补码处理', () => {
    expect(toLittleEndianHex(-1, 1)).toBe('ff')
  })

  it('输出长度恒为 size * 2', () => {
    for (const size of [1, 2, 4, 8]) {
      expect(toLittleEndianHex(1, size)).toHaveLength(size * 2)
    }
  })
})

describe('computeKuaishouLrcHex', () => {
  it.each([
    ['00', '00'],
    ['01', 'ff'],
    ['ff', '01'],
    ['0102', 'fd']
  ])('%s -> %s', (hex, lrc) => {
    expect(computeKuaishouLrcHex(hex)).toBe(lrc)
  })

  it('输出恒为两位十六进制', () => {
    for (const hex of ['00', 'abcdef', '0102030405']) {
      expect(computeKuaishouLrcHex(hex)).toMatch(/^[0-9a-f]{2}$/)
    }
  })

  it('校验和加原始字节和后低 8 位为 0', () => {
    const source = 'deadbeef'
    const sum = hexToSignedBytes(source).reduce((t, v) => t + (v & 255), 0)
    const lrc = parseInt(computeKuaishouLrcHex(source), 16)
    expect((sum + lrc) & 255).toBe(0)
  })
})

describe('deriveKuaishouB2has / B2sa', () => {
  it.each(['', 'a', 'kuaishou', 'did=web_1234567890'])('B2has 对 "%s" 的输出稳定', (input) => {
    expect(deriveKuaishouB2has(input)).toMatchSnapshot()
  })

  it('B2has 输出为 64 位小写十六进制', () => {
    expect(deriveKuaishouB2has('kuaishou')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('相同输入结果一致', () => {
    expect(deriveKuaishouB2has('x')).toBe(deriveKuaishouB2has('x'))
  })

  it('不同输入结果不同', () => {
    expect(deriveKuaishouB2has('x')).not.toBe(deriveKuaishouB2has('y'))
  })

  it('B2sa 返回 Int8Array，长度等于 B2has 的字符数', () => {
    const sa = deriveKuaishouB2sa('kuaishou')
    expect(sa).toBeInstanceOf(Int8Array)
    expect(sa).toHaveLength(deriveKuaishouB2has('kuaishou').length)
  })
})

describe('deriveKuaishouCts', () => {
  it('输出稳定', () => {
    expect(bytesToLowerHex(deriveKuaishouCts(deriveKuaishouB2sa('kuaishou')))).toMatchSnapshot()
  })

  it('空输入不抛错', () => {
    expect(() => deriveKuaishouCts(new Int8Array(0))).not.toThrow()
  })

  it('相同输入结果一致', () => {
    const input = deriveKuaishouB2sa('x')
    expect(Array.from(deriveKuaishouCts(input))).toEqual(Array.from(deriveKuaishouCts(input)))
  })
})

describe('transformKuaishouHeHex', () => {
  it('输出稳定', () => {
    expect(transformKuaishouHeHex('0102030405', 'ab')).toMatchSnapshot()
  })

  it('输出长度与输入拼接后一致', () => {
    expect(transformKuaishouHeHex('0102', 'ff')).toHaveLength(6)
  })
})

describe('deriveKuaishouKww', () => {
  it('cookie 里带 kwfv1 时直接复用该值', () => {
    expect(deriveKuaishouKww('kwfv1=ABCDEF; did=web_1')).toBe('ABCDEF')
  })

  it('kwfv1 的提取只匹配完整键名', () => {
    expect(deriveKuaishouKww('xkwfv1=NOPE')).not.toBe('NOPE')
  })

  it('无 kwfv1 时退回匿名值，形如 base64###ssrd', () => {
    expect(deriveKuaishouKww('did=web_1')).toMatch(/###ssrd$/)
  })

  it('不传 cookie 时也返回匿名值', () => {
    expect(deriveKuaishouKww(undefined)).toMatch(/###ssrd$/)
  })

  it('空字符串 cookie 走匿名分支', () => {
    expect(deriveKuaishouKww('')).toMatch(/###ssrd$/)
  })
})

describe('kuaishouSign 的隐式全局可变状态', () => {
  it('signInput 只依赖 payload，是可快照的确定值', () => {
    const payload = buildKuaishouHxfalconPayload(LIVE_API_URL)
    expect(buildKuaishouHxfalconSignInput(payload)).toMatchSnapshot()
  })

  it('caver 是稳定的非空字符串', () => {
    expect(typeof kuaishouSign.getCatVersion()).toBe('string')
    expect(kuaishouSign.getCatVersion().length).toBeGreaterThan(0)
  })
})

describe('kuaishouSign.signLiveApiUrl', () => {
  it('在 URL 上补齐 __NS_hxfalcon 与 caver，且保留原有参数', () => {
    freezeEntropy()
    const signed = kuaishouSign.signLiveApiUrl(LIVE_API_URL, 'did=web_1')
    const url = new URL(signed.url)

    expect(url.searchParams.get('__NS_hxfalcon')).toBeTruthy()
    expect(url.searchParams.get('caver')).toBe(kuaishouSign.getCatVersion())
    expect(url.searchParams.get('principalId')).toBe('pid1')
  })

  it('返回 kww 请求头', () => {
    freezeEntropy()
    const signed = kuaishouSign.signLiveApiUrl(LIVE_API_URL, 'kwfv1=TOKEN123')
    expect(signed.headers.kww).toBe('TOKEN123')
  })

  it('不传 cookie 时也能签名', () => {
    freezeEntropy()
    expect(() => kuaishouSign.signLiveApiUrl(LIVE_API_URL)).not.toThrow()
  })

  it('非法 URL 抛错', () => {
    expect(() => kuaishouSign.signLiveApiUrl('not-a-url')).toThrow()
  })

  it('返回结构包含 url / headers / signResult / signInput / catVersion', () => {
    freezeEntropy()
    const signed = kuaishouSign.signLiveApiUrl(LIVE_API_URL)
    expect(Object.keys(signed).sort()).toEqual(['catVersion', 'headers', 'signInput', 'signResult', 'url'])
  })
})
