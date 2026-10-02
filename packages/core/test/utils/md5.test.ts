import { createHash } from 'node:crypto'

import { md5Hex } from 'amagi/utils/md5'
import { describe, expect, it } from 'vitest'

/**
 * `utils/md5` 的契约。
 *
 * 判据只有一条，但必须两条腿走：
 * ① **标准向量**（RFC 1321 自己给的那批）钉住算法本身；
 * ② **与 `node:crypto` 全等**钉住「同一份代码」这件事 —— X-Bogus / secsdk / wbi
 *    三处签名从 `node:crypto` 换到这里，换完输出必须逐字节不变，这条等价是
 *    全部既有签名测试继续成立的前提。
 */
describe('utils/md5', () => {
  it('RFC 1321 标准向量', () => {
    expect(md5Hex('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5Hex('a')).toBe('0cc175b9c0f1b6a831c399e269772661')
    expect(md5Hex('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(md5Hex('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0')
    expect(md5Hex('abcdefghijklmnopqrstuvwxyz')).toBe('c3fcd3d76192e4007dfb496cca67e13b')
    expect(md5Hex('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')).toBe('d174ab98d277d9f5a5611c2c9f419d9f')
    expect(md5Hex('12345678901234567890123456789012345678901234567890123456789012345678901234567890')).toBe(
      '57edf4a22be3c955ac49da2e2107b67a'
    )
  })

  it('与 node:crypto 逐字节一致（含中文、二进制、跨块长度）', () => {
    const inputs: Array<string | Uint8Array> = [
      '',
      'kuaishou',
      '快手签名里的中文会按 UTF-8 编码',
      'x'.repeat(63),
      'x'.repeat(64),
      'x'.repeat(65),
      'x'.repeat(128),
      'x'.repeat(1000),
      new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]),
      new Uint8Array(0)
    ]

    for (const input of inputs) {
      const expected = createHash('md5')
        .update(typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input))
        .digest('hex')
      expect(md5Hex(input)).toBe(expected)
    }
  })
})
