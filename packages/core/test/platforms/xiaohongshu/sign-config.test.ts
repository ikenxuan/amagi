import { Base64Encoder, Xhshow } from '@ikenxuan/xhshow-ts'
import { generateXRapParam, generateXSCommon } from 'amagi/platforms/xiaohongshu/sign'
import { createXiaohongshuCryptoConfig } from 'amagi/platforms/xiaohongshu/sign/config'
import { describe, expect, it, vi } from 'vitest'

const COOKIE = 'a1=1900000000abcdef0123456789abcdef; web_session=test-session'
const encoder = new Base64Encoder()
const decodeCommon = (value: string): Record<string, unknown> => JSON.parse(encoder.decode(value))

describe('小红书签名配置（xhshow-ts 默认值 + 按 UA 派生平台字段）', () => {
  it('encodes the captured common versions in an actual signed header', () => {
    const client = new Xhshow(createXiaohongshuCryptoConfig())
    const common = decodeCommon(client.signXsCommon(COOKIE))
    expect(common).toMatchObject({ x1: '4.4.3', x4: '6.56.3', x5: '1900000000abcdef0123456789abcdef' })
  })

  it('x3 env 尾部取页面稳定后的 mns0301 值（第 7 位为 2）', () => {
    // 2026-09-26 解密页面自己签出的 20 条 x3：页面稳定后 env 第 7 字节是 0x81，即 2
    expect(createXiaohongshuCryptoConfig().ENV_CHECKS_DEFAULT[7]).toBe(2)
  })

  it('derives s0 and x2 from the request UA, with Windows falling through to other(5)', () => {
    // 真机 Edge 153（Windows）抓包：s0=5 / x2="Windows"。前端 getPlatformCode
    // 的 switch 没有 Windows 分支，所以 Windows 与未知平台一样落 other(5)。
    const cases: Array<[string | undefined, number, string]> = [
      [undefined, 5, 'Windows'],
      ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 5, 'Windows'],
      ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 3, 'Mac OS'],
      ['Mozilla/5.0 (X11; Linux x86_64)', 4, 'Linux'],
      // iPhone 的 UA 里带 "Mac OS X"，必须先判 iOS
      ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 1, 'iOS'],
      // Android 的 UA 里带 "Linux"，必须先判 Android
      ['Mozilla/5.0 (Linux; Android 15)', 2, 'Android'],
      ['some-unknown-client/1.0', 5, 'PC']
    ]

    for (const [ua, s0, x2] of cases) {
      const config = createXiaohongshuCryptoConfig(ua)
      const common = decodeCommon(new Xhshow(config).signXsCommon(COOKIE))
      expect({ s0: common.s0, x2: common.x2 }).toEqual({ s0, x2 })
      // webprofile 指纹与 XYS 载荷也必须指向同一个平台
      expect(config.DATA_PLATFORM).toBe(x2)
      expect(config.SIGNATURE_DATA_TEMPLATE.x2).toBe(x2)
    }
  })

  it('keeps the webBuild cookie and the x-s-common x4 on the same build number', () => {
    // 真机实测两者同为 6.56.3；此前 Cookie 铸 6.12.3、签名写 6.53.4，自相矛盾
    const config = createXiaohongshuCryptoConfig()
    expect(config.DATA_WEB_BUILD).toBe('6.56.3')
    expect(decodeCommon(new Xhshow(config).signXsCommon(COOKIE)).x4).toBe(config.DATA_WEB_BUILD)
  })

  it('refreshes x12 request time on every signature and shares session time across clients', () => {
    let now = Date.now() + 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const client = new Xhshow(createXiaohongshuCryptoConfig())
    const first = decodeCommon(client.signXsCommon(COOKIE))
    expect(first.x12).toEqual(expect.any(String))
    const [requestTime, sessionStart] = String(first.x12).split(';').map(Number)
    expect(requestTime).toBe(now)
    expect(Number.isSafeInteger(sessionStart)).toBe(true)
    expect(sessionStart).toBeGreaterThan(0)
    expect(sessionStart).toBeLessThanOrEqual(now)

    now += 250
    expect(decodeCommon(client.signXsCommon(COOKIE)).x12).toBe(now + ';' + sessionStart)
    expect(decodeCommon(new Xhshow(createXiaohongshuCryptoConfig()).signXsCommon(COOKIE)).x12).toBe(now + ';' + sessionStart)
  })

  it('also applies the modern common template through the public signer singleton', () => {
    const first = decodeCommon(generateXSCommon(COOKIE))
    expect(first).toMatchObject({ x1: '4.4.3', x4: '6.56.3' })
    const sessionStart = String(first.x12).split(';')[1]
    const nextTime = Date.now() + 1000
    vi.spyOn(Date, 'now').mockReturnValue(nextTime)
    expect(decodeCommon(generateXSCommon(COOKIE)).x12).toBe(nextTime + ';' + sessionStart)
  })

  it('两条分支都委托库原生 signXsCommon，只有 x8 / x9 随 b1 变', () => {
    // 2026-10-07 起 amagi 不再自己拼 JSON：库修掉 b1 格式后，手拼那条路只剩分叉风险。
    // 这条守的是「委托真的等价」：拿库原生算出的 b1 喂回来，整个对象必须相等。
    // 2026-10-06 浏览器稳态实测：传真实 b1 时 15 键与浏览器逐键一致，只差 a1 与 x12。
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000)
    const native = decodeCommon(new Xhshow(createXiaohongshuCryptoConfig()).signXsCommon(COOKIE))
    const viaB1 = decodeCommon(generateXSCommon(COOKIE, String(native.x8)))
    expect(viaB1).toEqual(native)
    const generated = decodeCommon(generateXSCommon(COOKIE))
    expect({ ...generated, x8: native.x8, x9: native.x9 }).toEqual(native)

    const withBuild = `${COOKIE}; webBuild=6.99.9`
    expect(decodeCommon(generateXSCommon(withBuild, 'session-b1')).x4).toBe('6.99.9')
    expect(decodeCommon(generateXSCommon(withBuild)).x4).toBe('6.99.9')
  })

  it('encodes rap protocol 10301 in the real envelope produced by the public signer', () => {
    const rap = generateXRapParam('//edith.xiaohongshu.com/api/sns/web/v1/feed', { source_note_id: 'n1' })
    expect(Buffer.from(rap, 'base64').readUInt32BE(20)).toBe(10301)
  })
})
