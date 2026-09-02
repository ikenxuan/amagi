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
  kuaishouSign as v7KuaishouSign,
  toLittleEndianHex,
  transformKuaishouHeHex,
  xorByteArrays
} from 'amagi/platforms/kuaishou/sign'
import {
  buildKuaishouHxfalconPayload as v6BuildPayload,
  buildKuaishouHxfalconSignInput as v6BuildSignInput,
  bytesToLowerHex as v6BytesToLowerHex,
  computeKuaishouLrcHex as v6ComputeLrc,
  deriveKuaishouB2has as v6B2has,
  deriveKuaishouB2sa as v6B2sa,
  deriveKuaishouCts as v6Cts,
  hexToSignedBytes as v6HexToSignedBytes,
  kuaishouSign as v6KuaishouSign,
  toLittleEndianHex as v6ToLittleEndian,
  transformKuaishouHeHex as v6TransformHe,
  xorByteArrays as v6Xor
} from 'amagi/platform/kuaishou/sign'
import { describe, expect, it } from 'vitest'

import { freezeEntropy } from '../../helpers/deterministic'

const LIVE_API_URL = 'https://live.kuaishou.com/live_api/baseuser/userinfo/byid?caver=2&principalId=pid1'

describe('纯原语与 v6 对照（快照一字不变）', () => {
  it('bytesToLowerHex', () => {
    const input = new Int8Array([0, 1, 15, 16, 255, -1])
    expect(bytesToLowerHex(input)).toBe(v6BytesToLowerHex(input))
  })

  it('hexToSignedBytes', () => {
    expect(hexToSignedBytes('00ff10')).toEqual(v6HexToSignedBytes('00ff10'))
  })

  it('xorByteArrays', () => {
    const a = new Int8Array([1, 2, 3])
    const b = new Int8Array([4, 5])
    expect(Array.from(xorByteArrays(a, b))).toEqual(Array.from(v6Xor(a, b)))
  })

  it('toLittleEndianHex', () => {
    expect(toLittleEndianHex(1, 4)).toBe(v6ToLittleEndian(1, 4))
    expect(toLittleEndianHex(0x1234, 2)).toBe(v6ToLittleEndian(0x1234, 2))
  })

  it('computeKuaishouLrcHex', () => {
    expect(computeKuaishouLrcHex('aabbcc')).toBe(v6ComputeLrc('aabbcc'))
  })

  it('deriveKuaishouB2has', () => {
    for (const input of ['', 'a', 'did=web_1234567890', 'kuaishou']) {
      expect(deriveKuaishouB2has(input)).toBe(v6B2has(input))
    }
  })

  it('deriveKuaishouB2sa', () => {
    expect(Array.from(deriveKuaishouB2sa('kuaishou'))).toEqual(Array.from(v6B2sa('kuaishou')))
  })

  it('deriveKuaishouCts', () => {
    const input = new Int8Array([1, 2, 3])
    expect(Array.from(deriveKuaishouCts(input))).toEqual(Array.from(v6Cts(input)))
  })

  it('transformKuaishouHeHex', () => {
    expect(transformKuaishouHeHex('aabb', 'cc')).toBe(v6TransformHe('aabb', 'cc'))
  })

  it('buildKuaishouHxfalconPayload', () => {
    expect(buildKuaishouHxfalconPayload(LIVE_API_URL)).toEqual(v6BuildPayload(LIVE_API_URL))
  })

  it('buildKuaishouHxfalconSignInput', () => {
    const payload = buildKuaishouHxfalconPayload(LIVE_API_URL)
    expect(buildKuaishouHxfalconSignInput(payload)).toBe(v6BuildSignInput(payload))
  })

  it('deriveKuaishouKww（kwfv1 路径）', () => {
    expect(deriveKuaishouKww('kwfv1=ABCDEF; did=web_1')).toBe('ABCDEF')
  })

  it('deriveKuaishouKww（无 kwfv1 时匿名值形状一致）', () => {
    // 匿名 kww 在 v6 里被模块级缓存，v7 随实例；这里只断言形状
    expect(deriveKuaishouKww('did=web_1')).toMatch(/^[A-Za-z0-9+/=]+###ssrd$/)
  })
})

describe('类方法结构与 v6 对照', () => {
  it('getCatVersion 与 v6 一致', () => {
    expect((v7KuaishouSign as unknown as { getCatVersion: () => string }).getCatVersion()).toBe(
      (v6KuaishouSign as unknown as { getCatVersion: () => string }).getCatVersion()
    )
  })

  it('signLiveApiUrl 结构一致', () => {
    const v7 = v7KuaishouSign as unknown as {
      signLiveApiUrl: (url: string, cookie?: string) => {
        headers: Record<string, string>
        catVersion: string
        signResult: string
        signInput: string
        url: string
      }
    }
    const v6 = v6KuaishouSign as unknown as typeof v7

    freezeEntropy()
    const v7signed = v7.signLiveApiUrl(LIVE_API_URL, 'did=web_1')
    freezeEntropy()
    const v6signed = v6.signLiveApiUrl(LIVE_API_URL, 'did=web_1')

    expect(v7signed.headers.kww).toMatch(/^[A-Za-z0-9+/=]+###ssrd$/)
    expect(v6signed.headers.kww).toMatch(/^[A-Za-z0-9+/=]+###ssrd$/)
    expect(v7signed.catVersion).toBe(v6signed.catVersion)
    expect(v7signed.signResult).toMatch(/^HUDR_.+\$HE_[0-9a-f]+$/)
    expect(v7signed.signResult.length).toBeGreaterThan(0)
    expect(v7signed.signInput).toBe(v6signed.signInput)
  })
})