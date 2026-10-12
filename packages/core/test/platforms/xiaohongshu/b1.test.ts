import { generateXSCommon } from 'amagi/platforms/xiaohongshu/sign'
import { createXiaohongshuCryptoConfig } from 'amagi/platforms/xiaohongshu/sign/config'
import { Base64Encoder } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import { describe, expect, it } from 'vitest'

const config = createXiaohongshuCryptoConfig()
const encoder = new Base64Encoder(config)
const COOKIE = 'a1=1900000000abcdef0123456789abcdef; web_session=test-session'

/** 按浏览器的逆过程解 b1：customBase64 → UTF-8 → latin1 密文 → RC4 → JSON */
const decodeB1 = (b1: string): Record<string, unknown> => {
  const std = [...b1].map((c) => config.STANDARD_BASE64_ALPHABET[config.CUSTOM_BASE64_ALPHABET.indexOf(c)] ?? c).join('')
  const cipher = Buffer.from(Buffer.from(std, 'base64').toString('utf8'), 'latin1')
  const key = Buffer.from(config.B1_SECRET_KEY)
  const S = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 255
    ;[S[i], S[j]] = [S[j], S[i]]
  }
  const out = Buffer.alloc(cipher.length)
  for (let k = 0, i = 0, j = 0; k < cipher.length; k++) {
    i = (i + 1) & 255
    j = (j + S[i]) & 255
    ;[S[i], S[j]] = [S[j], S[i]]
    out[k] = cipher[k] ^ S[(S[i] + S[j]) & 255]
  }
  return JSON.parse(out.toString('utf8'))
}

/** 未传会话 b1 时 `x-s-common` 里 `x8` 的明文 */
const generatedB1 = (): string => String(JSON.parse(encoder.decode(generateXSCommon(COOKIE))).x8)

/**
 * b1 的格式与字段由内联的 `sign/xhshow/` 负责（移植的上游用例见 `xhshow-b1-format.test.ts`）。
 * 这里守的是 amagi 这一侧：`x-s-common` 的 `x8` 必须真的是浏览器那个格式 ——
 * 一旦内联副本退回旧编码（数字数组文本）或字段版本倒退，下面三条会同时红。
 */
describe('小红书 x-s-common 的 b1（2026-10-07 浏览器 3.5.6 格式）', () => {
  it('解出来是 19 键 JSON，键序与浏览器一致，值全是字符串', () => {
    const obj = decodeB1(generatedB1())
    expect(Object.keys(obj)).toEqual([
      'x33',
      'x34',
      'x35',
      'x36',
      'x37',
      'x38',
      'x39',
      'x42',
      'x43',
      'x44',
      'x45',
      'x46',
      'x48',
      'x49',
      'x50',
      'x51',
      'x52',
      'x82',
      'x84'
    ])
    for (const v of Object.values(obj)) expect(typeof v).toBe('string')
    expect(obj).toMatchObject({ x39: '0', x42: '3.5.6', x43: 'Canvas not supported', x45: '__SEC_CAV__1-1-1-1-1|' })
    expect(String(obj.x82)).toHaveLength(300)
    expect(String(obj.x82).startsWith('1|_BHjFmfUMEtxhI|')).toBe(true)
  })

  it('x44 是采集时刻，x84 的 mt.to 是更早的 timeOrigin', () => {
    const now = Date.now()
    const obj = decodeB1(generatedB1())
    const x44 = Number(obj.x44)
    expect(now - x44).toBeGreaterThanOrEqual(100)
    expect(now - x44).toBeLessThan(1600)
    const to = Number(/^\{mt:\{to:(\d{13}(?:\.\d)?)\},m:\{\},k:\{\}/.exec(String(obj.x84))?.[1])
    expect(x44 - to).toBeGreaterThanOrEqual(3000)
    expect(x44 - to).toBeLessThan(14001)
  })

  it('编码的是密文字节本身，不是 1.2.0 那种数字数组文本', () => {
    const b1 = generatedB1()
    expect(encoder.decode(b1)).not.toMatch(/^\[\d/)
    // 用满整套字母表是密文高熵的直接表现（1.2.0 的数字数组文本只有 33 种字符）
    expect(new Set(b1).size).toBeGreaterThan(60)
  })
})
