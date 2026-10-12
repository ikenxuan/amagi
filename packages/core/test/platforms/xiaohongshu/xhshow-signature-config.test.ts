/**
 * 移植自上游 `xhshow-ts` 的 `tests/signature-config.test.ts`
 * （上游 commit `b138a4b`，v1.2.0，2026-10-12）。
 *
 * 只把 `node:test` + `node:assert/strict` 换成 vitest，断言语义一字未改。
 * 上游 `t.mock.method(Date, 'now', ...)` 换成 `vi.spyOn(Date, 'now')`；
 * 本仓 `vitest.config.ts` 开着 `restoreMocks`，每个用例结束后自动还原。
 */
import { a1PlatformDigit, Base64Encoder, CryptoConfig, expandXrapKey, Xhshow, xRapParam } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import { describe, expect, it, vi } from 'vitest'

const cookies = { a1: 'a'.repeat(52), web_session: 'test-session' }
const encoder = new Base64Encoder()

function decodeXsCommon(client: Xhshow): Record<string, unknown> {
  return JSON.parse(encoder.decode(client.signXsCommon(cookies)))
}

describe('上游 tests/signature-config.test.ts', () => {
  it('x-s-common encodes the captured web client versions', () => {
    const common = decodeXsCommon(new Xhshow())

    expect(common.x1).toBe('4.4.3')
    expect(common.x4).toBe('6.56.3')
    expect(common.x5).toBe(cookies.a1)
  })

  it('x-s-common defaults describe Windows: s0 falls through to other(5)', () => {
    // 前端 getPlatformCode 没有 Windows 分支，Windows 落 default → other(5)。
    // 真机 Edge 153 抓下来的 x-s-common 就是 s0=5 / x2="Windows"。
    const common = decodeXsCommon(new Xhshow())

    expect(common.s0).toBe(5)
    expect(common.x2).toBe('Windows')
  })

  it('forUserAgent derives s0 and x2 per platform', () => {
    const cases: Array<[string, number, string]> = [
      ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36', 5, 'Windows'],
      ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36', 3, 'Mac OS'],
      ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36', 4, 'Linux'],
      // iPhone 的 UA 里带 "Mac OS X"，必须先判 iOS，否则会被认成 Mac
      ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 1, 'iOS'],
      // Android 的 UA 里带 "Linux"，必须先判 Android
      ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/153.0.0.0 Mobile Safari/537.36', 2, 'Android'],
      ['some-unknown-client/1.0', 5, 'PC']
    ]

    for (const [userAgent, s0, x2] of cases) {
      const common = decodeXsCommon(new Xhshow(new CryptoConfig().forUserAgent(userAgent)))
      expect(common.s0, `s0 for ${x2}`).toBe(s0)
      expect(common.x2, `x2 for ${x2}`).toBe(x2)
    }
  })

  it('forUserAgent keeps x12 a live getter and preserves prior overrides', () => {
    const config = new CryptoConfig()
      .withOverrides({ DATA_WEB_BUILD: '6.12.3' })
      .forUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36')

    expect(config.DATA_WEB_BUILD).toBe('6.12.3')
    expect(config.DATA_PLATFORM).toBe('Linux')
    // b1 指纹把 UA 写进 fingerprint.x1，必须与 s0/x2 指向同一个平台
    expect(config.PUBLIC_USERAGENT).toMatch(/Linux x86_64/)

    // x12 必须仍是 getter：对象展开会把它冻成常量，请求时间就不再刷新了
    const descriptor = Object.getOwnPropertyDescriptor(config.SIGNATURE_XSCOMMON_TEMPLATE, 'x12')
    expect(typeof descriptor?.get).toBe('function')

    const client = new Xhshow(config)
    const first = String(decodeXsCommon(client).x12).split(';')[0]
    const later = String(decodeXsCommon(client).x12).split(';')[0]
    expect(Number(later) >= Number(first)).toBeTruthy()
  })

  it('x-s-common prefers the caller webBuild cookie for x4', () => {
    // x4 与 webBuild Cookie 同源；跟着调用方的 Cookie 走，避免库里的常量过期
    const common = JSON.parse(encoder.decode(new Xhshow().signXsCommon({ ...cookies, webBuild: '6.57.0' })))

    expect(common.x4).toBe('6.57.0')
    expect(decodeXsCommon(new Xhshow()).x4).toBe('6.56.3')
  })

  it('a1 platform digit uses the same mapping as s0', () => {
    // 真机 a1 尾部实测 "50000" —— Windows 的平台位是 5(other)，不是枚举里的 0
    expect(a1PlatformDigit('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/153.0.0.0')).toBe('5')
    expect(a1PlatformDigit('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/153.0.0.0')).toBe('3')
    expect(a1PlatformDigit('Mozilla/5.0 (X11; Linux x86_64) Chrome/153.0.0.0')).toBe('4')
    expect(a1PlatformDigit(undefined)).toBe('5')
  })

  it('XYW env flags do not vary by platform — bit 11 tracks webdriver, not the OS', () => {
    // 2026-09-25 同机对照：Windows 真机 Edge(webdriver=false) 第 11 位为 0，
    // 同一台机器上自动化 Chrome(webdriver=true) 为 1。所以这一串不按 OS 查表。
    const windows = new CryptoConfig().forUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/153.0.0.0')
    const linux = new CryptoConfig().forUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/153.0.0.0')

    expect(windows.XYW_ENV_FLAGS_DEFAULT).toBe(linux.XYW_ENV_FLAGS_DEFAULT)
    expect(windows.XYW_ENV_FLAGS_DEFAULT.split('|')[11]).toBe('0')
    expect(windows.XYW_ENV_FLAGS_DEFAULT).toBe('0|0|0|1|0|0|1|0|0|0|1|0|0|0|0|1|0|0|0')
  })

  it('x-s-common refreshes request time while keeping the module session timestamp', () => {
    let now = Date.now() + 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const client = new Xhshow()
    const first = decodeXsCommon(client)

    expect(typeof first.x12).toBe('string')
    const [requestTime, sessionStart] = String(first.x12).split(';').map(Number)
    expect(requestTime).toBe(now)
    expect(Number.isSafeInteger(sessionStart) && sessionStart > 0 && sessionStart <= now).toBeTruthy()

    now += 100
    expect(decodeXsCommon(client).x12).toBe(`${now};${sessionStart}`)
    expect(decodeXsCommon(new Xhshow()).x12).toBe(`${now};${sessionStart}`)
  })

  it('x-rap-param encodes SDK version 10301 in the envelope header', () => {
    const value = xRapParam('/api/sns/web/v1/feed', { source_note_id: 'test-note' })

    expect(Buffer.from(value, 'base64').readUInt32BE(20)).toBe(10301)
  })

  it('x-rap-param preserves an explicit SDK version override', () => {
    const value = xRapParam('/api/sns/web/v1/feed', {}, { sdkVersion: 10300 })

    expect(Buffer.from(value, 'base64').readUInt32BE(20)).toBe(10300)
  })

  it('the x-rap master key reproduces the round keys that used to be hardcoded', () => {
    // 这一层不是 SM4 变体，是换了 S 盒的 AES-128：主密钥 kqI1DTcwKX90ZtAy 经标准
    // AES 密钥展开可逐字复现原先抄在源码里的 11 组轮密钥（含末轮）。
    // 这组常量就是当初硬编码的那份，留作「改推导后仍字节等价」的判据。
    const HARDCODED = [
      [0x6b714931, 0x44546377, 0x4b583930, 0x5a744179],
      [0x89314c98, 0xcd652fef, 0x863d16df, 0xdc4957a6],
      [0xc205330c, 0x0f601ce3, 0x895d0a3c, 0x55145d9a],
      [0xd205006e, 0xdd651c8d, 0x543816b1, 0x012c4b2b],
      [0x770c2b6f, 0xaa6937e2, 0xfe512153, 0xff7d6a78],
      [0x7866fbf4, 0xd20fcc16, 0x2c5eed45, 0xd323873d],
      [0x90e9c67e, 0x42e60a68, 0x6eb8e72d, 0xbd9b6010],
      [0xe9c52bee, 0xab232186, 0xc59bc6ab, 0x7800a6bb],
      [0x13ba9a3e, 0xb899bbb8, 0x7d027d13, 0x0502dba8],
      [0x50613270, 0xe8f889c8, 0x95faf4db, 0x90f82f73],
      [0xf396b44f, 0x1b6e3d87, 0x8e94c95c, 0x1e6ce62f]
    ]

    const expanded = expandXrapKey(Buffer.from(new CryptoConfig().XRAP_MASTER_KEY, 'ascii'))

    expect(expanded.length).toBe(11)
    expect(expanded).toEqual(HARDCODED)
    // 第 0 轮就是主密钥的 ASCII 字节本身，这是 AES 密钥展开的定义
    expect(Buffer.from(Uint32Array.from(expanded[0]).buffer).length).toBe(16)
  })

  it('expandXrapKey rejects a key that is not 16 bytes', () => {
    expect(() => expandXrapKey(Buffer.from('too-short', 'ascii'))).toThrow(/16 bytes/)
  })

  it('x-s-common preserves an explicit template override', () => {
    const defaults = new CryptoConfig()
    const config = defaults.withOverrides({
      SIGNATURE_XSCOMMON_TEMPLATE: {
        ...defaults.SIGNATURE_XSCOMMON_TEMPLATE,
        x1: 'custom-version',
        x4: 'custom-build',
        x12: '100;50'
      }
    })
    const common = decodeXsCommon(new Xhshow(config))

    expect(common.x1).toBe('custom-version')
    expect(common.x4).toBe('custom-build')
    expect(common.x12).toBe('100;50')
  })
})
