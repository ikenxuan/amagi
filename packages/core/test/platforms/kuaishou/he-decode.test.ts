import { decodeKuaishouHe, deriveKuaishouHeHex, deriveKuaishouPureSignature } from 'amagi/platforms/kuaishou/sign/he'
import { describe, expect, it } from 'vitest'

/**
 * 快手 `$HE_` 解码层的契约。
 *
 * HE 段没有外部 oracle（仓库里没有浏览器产出的快手签名捕获），所以判据是
 * **自洽 + 区分力**：
 * ① 用钉死输入的真实签名器产签名 → 拆解必须原样读回 count / 时钟 / 两个随机数，
 *    且双层 LRC 与四个布局常量全部通过；
 * ② 任何一位被改动，至少一个检查要红 —— 解码器不是对什么都说通过；
 * ③ HUDR 段不参与拆解（它整段是 ChaCha 密文，下面没有明文可找）。
 */
const CONTEXT = {
  count: 7,
  hudrBody: 'AAECAwQFBgcICQ==',
  randomValue: 0.5,
  signInput: 'sign-input-sample',
  startupRandom: 0x1a2b3c4d5e6f,
  timestamp: 1789010742000
}

describe('快手 $HE_ 解码层', () => {
  it('签名器产出 → 拆解读回钉死的 count / 时钟 / 随机数', () => {
    const he = deriveKuaishouHeHex(CONTEXT)
    expect(he.finalHex).toHaveLength(90)

    const decoded = decodeKuaishouHe(he.finalHex)
    expect(decoded.problems).toEqual([])
    expect(decoded.count).toBe(CONTEXT.count)
    expect(decoded.timestampMs).toBe(CONTEXT.timestamp)
    expect(decoded.startupRandom).toBe(CONTEXT.startupRandom)
    expect(decoded.random).toBe(Math.floor(CONTEXT.randomValue * 281474976710655))
    expect(decoded.hashFieldHex.toLowerCase()).toBe(he.hashFieldHex.toLowerCase())
  })

  it('完整签名（HUDR_ + $HE_）里能定位并拆出 HE 段', () => {
    const { signResult } = deriveKuaishouPureSignature(CONTEXT)
    const heHex = signResult.split('$HE_')[1]
    expect(decodeKuaishouHe(heHex).problems).toEqual([])
  })

  it('任何一位被改，至少一个检查红 —— 拆解有区分力', () => {
    const he = deriveKuaishouHeHex(CONTEXT)
    const flipLast = (hex: string): string => hex.replace(/.$/, (char) => (char === 'a' ? 'b' : 'a'))

    // 改末位：动的是异或键，信封 LRC 必炸
    expect(decodeKuaishouHe(flipLast(he.finalHex)).problems).toContain('envelope checksum')

    // 改中段：信封 LRC（覆盖全部 44 字节）必然连坐
    const tampered = flipLast(he.finalHex.slice(0, 44)) + he.finalHex.slice(44)
    expect(decodeKuaishouHe(tampered).problems.length).toBeGreaterThan(0)

    // 长度与字符集
    expect(decodeKuaishouHe('zz' + he.finalHex.slice(2)).problems).toContain('not hex')
    expect(decodeKuaishouHe(he.finalHex.slice(2)).problems).toContain('length not 90')
  })

  it('count 掩码真的被解掉 —— 不同 count 拆出不同值且各自还原', () => {
    for (const count of [0, 1, 42, 3131873467 ^ 5]) {
      const decoded = decodeKuaishouHe(deriveKuaishouHeHex({ ...CONTEXT, count }).finalHex)
      expect(decoded.problems).toEqual([])
      expect(decoded.count).toBe(count >>> 0)
    }
  })
})
