/**
 * 移植自上游 `xhshow-ts` 的 `tests/common-b1.test.ts`
 * （上游 commit `b138a4b`，v1.2.0，2026-10-12）。
 *
 * 只把 `node:test` + `node:assert/strict` 换成 vitest，断言语义一字未改。
 * 上游用 `t.mock.method(...)` 打桩，这里换成 `vi.spyOn(...).mockImplementation(...)`；
 * 本仓 `vitest.config.ts` 开着 `restoreMocks`，每个用例结束后自动还原。
 * 上游 `assert.throws(fn, { name, message })` 的对象形式对应
 * `toThrow(expect.objectContaining({ ... }))`，逐项比对错误属性。
 */
import { Base64Encoder, CRC32, FingerprintGenerator, SessionManager, Xhshow, XsCommonSigner } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import type { XsCommonOptions } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import { describe, expect, it, vi } from 'vitest'

const cookies = Object.freeze({ a1: 'a'.repeat(52), webBuild: '6.57.0' })
const encoder = new Base64Encoder()
const decode = (value: string): Record<string, unknown> => JSON.parse(encoder.decode(value))

function forbidFingerprintGeneration(): void {
  const unexpected = (): never => {
    throw new Error('显式 b1 不应生成指纹')
  }
  vi.spyOn(FingerprintGenerator.prototype, 'generate').mockImplementation(unexpected)
  vi.spyOn(FingerprintGenerator.prototype, 'generateB1').mockImplementation(unexpected)
}

describe('上游 tests/common-b1.test.ts', () => {
  it('显式 b1 原样进入 x8，x9 使用前端 CRC32 变体', () => {
    forbidFingerprintGeneration()
    const signer = new XsCommonSigner()
    const options = Object.freeze({ b1: '123456789' })
    const common = decode(signer.sign(cookies, options))

    expect(common.x5).toBe(cookies.a1)
    expect(common.x4).toBe(cookies.webBuild)
    expect(common.x8).toBe(options.b1)
    expect(common.x9).toBe(0x264cba06) // 标准 CRC32 0xCBF43926 再异或 0xEDB88320。
    expect(options).toEqual({ b1: '123456789' })
  })

  it('不裁剪或重编码调用方的 b1', () => {
    forbidFingerprintGeneration()
    const b1 = ' \t合成/+==\n'
    const common = decode(new Xhshow().signXsCommon(cookies, { b1 }))
    expect(common.x8).toBe(b1)
    expect(common.x9).toBe(CRC32.crc32JsInt(b1))
  })

  it('Cookie 字符串与 signXsc 别名均透传显式 b1', () => {
    forbidFingerprintGeneration()
    const client = new Xhshow()
    const cookie = `a1=${cookies.a1}; webBuild=${cookies.webBuild}`
    for (const sign of [client.signXsCommon.bind(client), client.signXsc.bind(client)]) {
      for (const input of [cookie, cookies]) {
        const common = decode(sign(input, { b1: 'synthetic-b1' }))
        expect(common.x8).toBe('synthetic-b1')
        expect(common.x5).toBe(cookies.a1)
        expect(common.x4).toBe(cookies.webBuild)
      }
    }
  })

  it('每次调用的 b1 不写入 signer 或 client 全局状态', () => {
    forbidFingerprintGeneration()
    const signer = new XsCommonSigner()
    const client = new Xhshow()
    for (const sign of [signer.sign.bind(signer), client.signXsCommon.bind(client)]) {
      const first = decode(sign(cookies, { b1: 'first-b1' }))
      const secondCookies = { a1: 'b'.repeat(52) }
      const second = decode(sign(secondCookies, { b1: 'second-b1' }))
      const again = decode(sign(cookies, { b1: 'first-b1' }))
      expect(first.x8).toBe('first-b1')
      expect(second.x8).toBe('second-b1')
      expect(second.x5).toBe(secondCookies.a1)
      expect(again.x8).toBe(first.x8)
      expect(again.x9).toBe(first.x9)
    }
  })

  it('signHeaders 及 GET/POST 包装共用会话 b1 与 SSK', () => {
    forbidFingerprintGeneration()
    const client = new Xhshow()
    const session = new SessionManager(undefined, {
      b1: 'session-b1',
      webSsk: { 'xhs-pc-web': Buffer.alloc(32, 7).toString('base64') }
    })
    const path = '/api/sns/web/v1/test'
    const headers = [
      client.signHeaders('GET', path, cookies, 'xhs-pc-web', {}, undefined, 1700000000, session),
      client.signHeadersGet(path, cookies, 'xhs-pc-web', {}, 1700000000, session),
      client.signHeadersPost(path, cookies, 'xhs-pc-web', {}, 1700000000, session)
    ]
    for (const header of headers) {
      expect(decode(header['x-s-common']).x8).toBe('session-b1')
      const xs = client.decodeXs(header['x-s'])
      expect(Object.keys(xs.x6)).toEqual(['xhs-pc-web'])
      expect(Object.keys(xs.x7)).toEqual(['xhs-pc-web'])
    }
    const xyw = client.signHeadersGet(path, cookies, 'xhs-pc-web', {}, 1700000000, session, 'xyw')
    expect(decode(xyw['x-s-common']).x8).toBe('session-b1')
  })

  it('两个会话的 b1 独立，更新一份不影响另一份', () => {
    forbidFingerprintGeneration()
    const client = new Xhshow()
    const first = new SessionManager(undefined, { b1: 'first-b1' })
    const second = new SessionManager(undefined, { b1: 'second-b1' })
    first.setB1('updated-b1')
    expect(decode(client.signXsCommon(cookies, first)).x8).toBe('updated-b1')
    expect(decode(client.signXsCommon(cookies, second)).x8).toBe('second-b1')
  })

  it('缺省调用及显式 undefined 保留原有生成行为，不缓存前次 b1', () => {
    const generated = vi.spyOn(FingerprintGenerator.prototype, 'generateB1').mockImplementation(() => 'generated-b1')
    const client = new Xhshow()
    client.signXsCommon(cookies, { b1: 'explicit-b1' })
    expect(generated.mock.calls.length).toBe(0)
    for (const options of [undefined, {}, { b1: undefined }]) {
      expect(decode(client.signXsCommon(cookies, options)).x8).toBe('generated-b1')
    }
    const session = new SessionManager(undefined, { b1: 'session-b1' })
    session.setB1(undefined)
    expect(decode(client.signXsCommon(cookies, session)).x8).toBe('generated-b1')
    expect(generated.mock.calls.length).toBe(4)
  })

  it('非法 b1 明确报错，不生成替代指纹，不把输入写入错误', () => {
    forbidFingerprintGeneration()
    const client = new Xhshow()
    for (const b1 of ['', ' \t\n', null, false, 12, { privateValue: 'secret-fixture' }, []]) {
      const options = { b1 } as XsCommonOptions
      for (const sign of [
        () => new XsCommonSigner().sign(cookies, options),
        () => client.signXsCommon(cookies, options),
        () => client.signXsc(cookies, options),
        () => new SessionManager(undefined, options)
      ]) {
        expect(sign).toThrow(expect.objectContaining({ name: 'TypeError', message: 'b1 必须是非空字符串' }))
      }
    }
    const session = new SessionManager(undefined, { b1: 'valid-b1' })
    expect(() => session.setB1('')).toThrow(TypeError)
    expect(session.b1).toBe('valid-b1')
    session.b1 = ''
    expect(() => client.signHeadersGet('/api/test', cookies, undefined, undefined, undefined, session)).toThrow(TypeError)
  })

  it('提供 b1 仍要求 Cookie 含 a1', () => {
    forbidFingerprintGeneration()
    expect(() => new XsCommonSigner().sign({}, { b1: 'synthetic-b1' })).toThrow(/Missing 'a1'/)
    expect(() => new Xhshow().signXsCommon('', { b1: 'synthetic-b1' })).toThrow(/Missing 'a1'/)
  })
})
