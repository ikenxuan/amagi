/**
 * 移植自上游 `xhshow-ts` 的 `tests/ssk-validation.test.ts`
 * （上游 commit `b138a4b`，v1.2.0，2026-10-12）。
 *
 * 只把 `node:test` + `node:assert/strict` 换成 vitest，断言语义一字未改。
 * `assert.throws(fn, { message })` 的对象形式对应 `toThrow(expect.objectContaining({ ... }))`。
 */
import { createCipheriv, createHash, createPublicKey, diffieHellman, generateKeyPairSync } from 'node:crypto'

import { buildSskProof, createWebSskExchange, parseWebSsk, SessionManager } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import type { WebSsk } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import { describe, expect, it } from 'vitest'

const md5 = '0123456789abcdef0123456789abcdef'
const ssk = Buffer.alloc(32, 0xff)
const key = ssk.toString('base64')
const nonce = new Uint8Array([1, 2, 3, 4])
const malformed = [key.slice(0, -1), `${key}\n`, `${key}!!!!`, key.replaceAll('/', '_'), `${key}=`, `=${key}`]

describe('上游 tests/ssk-validation.test.ts', () => {
  it('SSK 恰好 32 字节时 x7 只有 nonce 与摘要', () => {
    const proof = buildSskProof(md5, Object.freeze({ app: key }), nonce)!
    const packet = Buffer.from(proof.x7.app, 'base64')
    expect(packet.length).toBe(24)
    expect(packet.subarray(0, 4)).toEqual(Buffer.from(nonce))
    expect(packet.subarray(4)).toEqual(
      createHash('sha1')
        .update(Buffer.concat([ssk, nonce]))
        .digest()
    )
    expect(proof.x6.app).toBe(
      createHash('sha1')
        .update(Buffer.concat([Buffer.from(md5, 'hex'), packet]))
        .digest('base64')
    )
    expect(nonce).toEqual(new Uint8Array([1, 2, 3, 4]))
  })

  it('x5 接受大小写 32hex，不接受 64hex', () => {
    expect(buildSskProof(md5.toUpperCase(), { app: key }, nonce)).toEqual(buildSskProof(md5, { app: key }, nonce))
    expect(() => buildSskProof(md5.repeat(2), { app: key })).toThrow(/16-byte MD5/)
  })

  it('畸形 Base64 项被跳过，其他 appId 不受影响', () => {
    for (const value of [...malformed, '', 123, null, false]) {
      expect(buildSskProof(md5, { invalid: value } as WebSsk)).toBe(null)
      const proof = buildSskProof(md5, { invalid: value, valid: key } as WebSsk, nonce)!
      expect(Object.keys(proof.x6)).toEqual(['valid'])
      expect(Object.keys(proof.x7)).toEqual(['valid'])
    }
  })

  it('多 appId 独立使用各自密钥，原型键不被吞掉', () => {
    const keys = Object.fromEntries([
      ['__proto__', key],
      ['constructor', Buffer.alloc(48, 3).toString('base64')],
      ['app', Buffer.alloc(32, 7).toString('base64')],
      ['', key]
    ])
    const proof = buildSskProof(md5, keys, nonce)!
    expect(Object.getPrototypeOf(proof.x6)).toBe(null)
    expect(Object.getPrototypeOf(proof.x7)).toBe(null)
    expect(Object.keys(proof.x6)).toEqual(['__proto__', 'constructor', 'app'])
    expect(Object.keys(proof.x7)).toEqual(Object.keys(proof.x6))
    for (const app of Object.keys(proof.x6)) {
      const single = buildSskProof(md5, { [app]: keys[app] }, nonce)!
      expect(proof.x6[app]).toBe(single.x6[app])
      expect(proof.x7[app]).toBe(single.x7[app])
    }
    expect(Object.hasOwn(JSON.parse(JSON.stringify(proof.x7)), '__proto__')).toBe(true)
  })

  it('SSK 对象与 JSON 的结构检查一致，SessionManager 不引用输入映射', () => {
    for (const value of [[], [key], 1, true, null, undefined]) {
      expect(parseWebSsk(value as unknown as WebSsk)).toEqual({})
    }
    const input = { app: key }
    const session = new SessionManager(undefined, { webSsk: input })
    input.app = 'changed'
    expect(session.webSsk.app).toBe(key)
    const next = { app: key }
    session.setWebSsk(next)
    next.app = 'changed-again'
    expect(session.webSsk.app).toBe(key)
  })

  it('交换拒绝畸形公钥和密文，错误不回显输入', () => {
    for (const value of malformed) {
      expect(() => createWebSskExchange(value)).toThrow(expect.objectContaining({ message: 'Invalid Base64 value' }))
    }
    expect(() => createWebSskExchange(Buffer.alloc(31).toString('base64'))).toThrow(/32 bytes/)
    const exchange = createWebSskExchange(key)
    for (const value of malformed) {
      expect(() => exchange.acceptEncryptedSsk(value)).toThrow(expect.objectContaining({ message: 'Invalid Base64 value' }))
    }
    expect(() => exchange.acceptEncryptedSsk(Buffer.alloc(27).toString('base64'))).toThrow(/too short/)
  })

  it('密文只可由对应临时私钥解开，短 SSK 与篡改包均被拒绝', () => {
    const server = generateKeyPairSync('x25519')
    const publicKey = Buffer.from(server.publicKey.export({ format: 'jwk' }).x!, 'base64url').toString('base64')
    const first = createWebSskExchange(publicKey)
    const second = createWebSskExchange(publicKey)
    const issue = (plaintext: Buffer): string => {
      const clientKey = createPublicKey({
        key: { kty: 'OKP', crv: 'X25519', x: Buffer.from(first.clientPublicKeyBase64, 'base64').toString('base64url') },
        format: 'jwk'
      })
      const shared = diffieHellman({ privateKey: server.privateKey, publicKey: clientKey })
      const iv = Buffer.alloc(12, 4)
      const cipher = createCipheriv('aes-256-gcm', shared, iv)
      return Buffer.concat([iv, cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]).toString('base64')
    }
    const encrypted = issue(ssk)
    expect(first.acceptEncryptedSsk(encrypted)).toBe(key)
    expect(() => second.acceptEncryptedSsk(encrypted)).toThrow()
    expect(() => first.acceptEncryptedSsk(issue(Buffer.alloc(31)))).toThrow(/at least 32 bytes/)
    for (const offset of [0, 12, Buffer.from(encrypted, 'base64').length - 1]) {
      const tampered = Buffer.from(encrypted, 'base64')
      tampered[offset] ^= 1
      expect(() => first.acceptEncryptedSsk(tampered.toString('base64'))).toThrow()
    }
  })

  it('全零 X25519 共享密钥不能用于解密', () => {
    const exchange = createWebSskExchange(Buffer.alloc(32).toString('base64'))
    expect(() => exchange.acceptEncryptedSsk(Buffer.alloc(60).toString('base64'))).toThrow()
  })
})
