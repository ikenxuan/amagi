/**
 * 纯 TypeScript 的 MD5（RFC 1321），不依赖任何运行环境内置模块。
 *
 * ## 为什么不用 `node:crypto`
 *
 * MD5 出现在三处签名里（抖音 X-Bogus、抖音 `x-secsdk-web-signature`、B站 `w_rid`），
 * 而签名验证工具要在**浏览器**里跑 `@ikenxuan/amagi/signing` 这份代码 —— 页面存在的
 * 意义是证明实现本身还是对的，所以实现必须能进浏览器。`node:crypto` 进不去，
 * 这里就是那份「同一份代码」的MD5。
 *
 * 只给签名算法用。MD5 早已不具密码学安全性，不要把它当通用哈希用。
 *
 * ## 边界
 *
 * - 输入按字节处理；字符串先用 `TextEncoder` 转 UTF-8（与 `node:crypto`
 *   `createHash('md5')` 默认的 `'utf8'` 编码一致，两边输出逐字节相同）。
 * - 长度计数用两次 `* 4294967296` 进位模拟 64 位比特长度，超出 `Number.MAX_SAFE_INTEGER`
 *   字节的输入不受支持（签名场景不可能出现）。
 */

/** 每个 round 使用的 32 位常量，来自 sin 函数绝对值的整数部分（RFC 1321 附录） */
const T = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1,
  0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453,
  0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942,
  0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d,
  0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
] as const

/** 每步循环左移的位数（RFC 1321 的 s 表） */
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
] as const

const rotateLeft = (value: number, shift: number): number => ((value << shift) | (value >>> (32 - shift))) >>> 0

/** 小端序读一个 32 位字 */
const readWordLE = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0

/**
 * 计算一份消息的 MD5，返回 32 位小写十六进制。
 *
 * @param input - 字节序列，或先按 UTF-8 编码的字符串
 * @returns 32 个小写十六进制字符
 */
export const md5Hex = (input: string | Uint8Array): string => {
  const message = typeof input === 'string' ? new TextEncoder().encode(input) : input
  const byteLength = message.length

  /* 填充：补 0x80，再补 0 到 ≡ 56 (mod 64)，最后 8 字节是小端比特长度 */
  const paddedLength = ((byteLength + 8) >> 6) * 64 + 64
  const padded = new Uint8Array(paddedLength)
  padded.set(message)
  padded[byteLength] = 0x80
  const bitLength = byteLength * 8
  padded[paddedLength - 8] = bitLength & 0xff
  padded[paddedLength - 7] = (bitLength >>> 8) & 0xff
  padded[paddedLength - 6] = (bitLength >>> 16) & 0xff
  padded[paddedLength - 5] = (bitLength >>> 24) & 0xff
  /* 超过 512 MiB 的高 32 位进位；签名场景到不了，但别悄悄给 0 */
  const highBits = Math.floor(bitLength / 4294967296)
  padded[paddedLength - 4] = highBits & 0xff

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    const words = new Array<number>(16)
    for (let index = 0; index < 16; index++) words[index] = readWordLE(padded, chunk + index * 4)

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let step = 0; step < 64; step++) {
      let f: number
      let g: number
      if (step < 16) {
        f = (b & c) | (~b & d)
        g = step
      } else if (step < 32) {
        f = (d & b) | (~d & c)
        g = (5 * step + 1) % 16
      } else if (step < 48) {
        f = b ^ c ^ d
        g = (3 * step + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * step) % 16
      }

      const sum = (a + f + T[step] + words[g]) >>> 0
      const shifted = rotateLeft(sum, S[step])
      a = d
      d = c
      c = b
      b = (b + shifted) >>> 0
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  /* 摘要按小端序输出四个寄存器 */
  const digest = new Uint8Array(16)
  for (const [index, word] of [a0, b0, c0, d0].entries()) {
    digest[index * 4] = word & 0xff
    digest[index * 4 + 1] = (word >>> 8) & 0xff
    digest[index * 4 + 2] = (word >>> 16) & 0xff
    digest[index * 4 + 3] = (word >>> 24) & 0xff
  }

  let hex = ''
  for (const byte of digest) hex += byte.toString(16).padStart(2, '0')
  return hex
}
