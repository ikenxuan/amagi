/**
 * 移植自上游 `xhshow-ts` 的 `tests/b1-format.test.ts`
 * （上游 commit `b138a4b`，v1.2.0，2026-10-12）。
 *
 * 只把 `node:test` + `node:assert/strict` 换成 vitest，断言语义一字未改。
 * 上游源码同步进本仓时目录结构保持原样，所以 import 只需把 `../src/...`
 * 换成自别名 `amagi/platforms/xiaohongshu/sign/xhshow`。
 */
import { CryptoConfig, FingerprintGenerator } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import { describe, expect, it } from 'vitest'

// 按浏览器的逆过程解 b1：customBase64 → UTF-8 → latin1 密文 → RC4 → JSON
const config = new CryptoConfig()
function decodeB1(b1: string): Record<string, unknown> {
  const std = [...b1]
    .map((c) => {
      const i = config.CUSTOM_BASE64_ALPHABET.indexOf(c)
      return i < 0 ? c : config.STANDARD_BASE64_ALPHABET[i]
    })
    .join('')
  const cipher = Buffer.from(Buffer.from(std, 'base64').toString('utf8'), 'latin1')
  const key = Buffer.from(config.B1_SECRET_KEY)
  const S = [...Array(256).keys()]
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

const generator = new FingerprintGenerator()
const fp = generator.generate({ a1: 'a'.repeat(52) }, config.PUBLIC_USERAGENT)
const b1 = generator.generateB1(fp)

describe('上游 tests/b1-format.test.ts', () => {
  it('b1 解出来是 19 键 JSON，键序与 2026-10 浏览器一致', () => {
    const obj = decodeB1(b1)
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
    // 浏览器里每个值都是字符串，x39 也不例外
    for (const [k, v] of Object.entries(obj)) expect(typeof v, k).toBe('string')
    expect(obj.x42).toBe('3.5.6')
    expect(obj.x39).toBe('0')
  })

  it('b1 编码的是密文字节本身，不是数字数组文本', () => {
    // 旧实现 customBase64(JSON.stringify(bytes))：解出来以 `[` 开头、只有数字和逗号
    const std = [...b1].map((c) => config.STANDARD_BASE64_ALPHABET[config.CUSTOM_BASE64_ALPHABET.indexOf(c)] ?? c).join('')
    const text = Buffer.from(std, 'base64').toString('utf8')
    expect(text).not.toMatch(/^\[\d/)
    // 用满整套字母表是密文高熵的直接表现（旧格式只有 33 种字符）
    expect(new Set(b1).size > 60, `distinct=${new Set(b1).size}`).toBeTruthy()
  })

  it('x82 / x84 / x44 的形状与浏览器稳态一致', () => {
    const obj = decodeB1(b1)
    const x82 = String(obj.x82)
    expect(x82.startsWith('1|_BHjFmfUMEtxhI|')).toBeTruthy()
    expect(x82.length).toBe(300)
    expect(String(obj.x84)).toMatch(
      /^\{mt:\{to:\d{13}(\.\d)?\},m:\{\},k:\{\},p:\{ulr:0,f:1,ps:1\},st:\{h:0,f:1,kr:0\},ft:\{ae:null,ak:null,cdr:null,bf:null,fi:null\}\}$/
    )
    const x44 = Number(obj.x44)
    const timeOrigin = Number(/to:([\d.]+)/.exec(String(obj.x84))?.[1])
    expect(x44 <= Date.now() && Date.now() - x44 < 5000).toBeTruthy()
    expect(timeOrigin < x44 && x44 - timeOrigin < 15000).toBeTruthy()
  })
})
