/**
 * SM3 摘要（GM/T 0004-2012），抖音 bdms 签名链使用的变体
 *
 * 与标准实现的唯一差异：字符串按 `charCodeAt` 逐字符取字节（非 UTF-8 编码），
 * 与浏览器里 bdms 的 `strToBytes` 行为一致。签名输入均为 ASCII，实际不会踩到多字节分支，
 * 但仍保留该分支以保证与浏览器实现逐位一致。
 */

/** 循环左移 32 位 */
const rotl = (x: number, n: number): number => {
  const shift = n % 32
  return ((x << shift) | (x >>> (32 - shift))) >>> 0
}

/** 轮常量 Tj */
const tj = (j: number): number => (j < 16 ? 0x79cc4519 : 0x7a879d8a)

/** 布尔函数 FFj */
const ff = (j: number, x: number, y: number, z: number): number => (j < 16 ? (x ^ y ^ z) >>> 0 : ((x & y) | (x & z) | (y & z)) >>> 0)

/** 布尔函数 GGj */
const gg = (j: number, x: number, y: number, z: number): number => (j < 16 ? (x ^ y ^ z) >>> 0 : ((x & y) | (~x & z)) >>> 0)

/** 初始向量 IV */
const IV = [0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600, 0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e]

/** 字符串转字节数组：逐字符 charCodeAt，大于一字节时按大端拆分 */
const strToBytes = (input: string): number[] => {
  const bytes: number[] = []
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i)
    const chunk: number[] = []
    do {
      chunk.push(code & 0xff)
      code >>= 8
    } while (code)
    bytes.push(...chunk.reverse())
  }
  return bytes
}

/** 消息扩展：生成 W[0..67] 与 W'[0..63]（后者放在 68 之后） */
const expand = (block: number[]): number[] => {
  const w = new Array<number>(132)
  for (let i = 0; i < 16; i++) {
    w[i] = ((block[i * 4] << 24) | (block[i * 4 + 1] << 16) | (block[i * 4 + 2] << 8) | block[i * 4 + 3]) >>> 0
  }
  for (let j = 16; j < 68; j++) {
    let x = w[j - 16] ^ w[j - 9] ^ rotl(w[j - 3], 15)
    x = x ^ rotl(x, 15) ^ rotl(x, 23)
    w[j] = (x ^ rotl(w[j - 13], 7) ^ w[j - 6]) >>> 0
  }
  for (let j = 0; j < 64; j++) {
    w[j + 68] = (w[j] ^ w[j + 4]) >>> 0
  }
  return w
}

/** SM3 压缩函数：就地更新寄存器 */
const compress = (reg: number[], block: number[]): void => {
  const w = expand(block)
  const r = reg.slice()
  for (let j = 0; j < 64; j++) {
    let ss1 = (rotl(r[0], 12) + r[4] + rotl(tj(j), j)) & 0xffffffff
    ss1 = rotl(ss1 >>> 0, 7)
    const ss2 = (ss1 ^ rotl(r[0], 12)) >>> 0
    const tt1 = (ff(j, r[0], r[1], r[2]) + r[3] + ss2 + w[j + 68]) >>> 0
    const tt2 = (gg(j, r[4], r[5], r[6]) + r[7] + ss1 + w[j]) >>> 0
    r[3] = r[2]
    r[2] = rotl(r[1], 9)
    r[1] = r[0]
    r[0] = tt1
    r[7] = r[6]
    r[6] = rotl(r[5], 19)
    r[5] = r[4]
    r[4] = (tt2 ^ rotl(tt2, 9) ^ rotl(tt2, 17)) >>> 0
  }
  for (let i = 0; i < 8; i++) {
    reg[i] = (reg[i] ^ r[i]) >>> 0
  }
}

/** 按 SM3 规则填充消息（0x80 + 0 + 64 位比特长度） */
const pad = (bytes: number[]): number[] => {
  const padded = bytes.slice()
  const bitLength = bytes.length * 8
  padded.push(0x80)
  while (padded.length % 64 !== 56) {
    padded.push(0x00)
  }
  const high = Math.floor(bitLength / 0x100000000)
  for (let i = 0; i < 4; i++) padded.push((high >>> ((3 - i) * 8)) & 0xff)
  for (let i = 0; i < 4; i++) padded.push((bitLength >>> ((3 - i) * 8)) & 0xff)
  return padded
}

/**
 * 计算 SM3 摘要
 * @param message 待摘要的字符串或字节数组
 * @returns 32 字节摘要
 */
export const sm3 = (message: string | number[]): number[] => {
  const bytes = typeof message === 'string' ? strToBytes(message) : message
  const reg = IV.slice()
  const padded = pad(bytes)
  for (let i = 0; i < padded.length; i += 64) {
    compress(reg, padded.slice(i, i + 64))
  }
  const digest = new Array<number>(32)
  for (let i = 0; i < 8; i++) {
    digest[i * 4] = (reg[i] >>> 24) & 0xff
    digest[i * 4 + 1] = (reg[i] >>> 16) & 0xff
    digest[i * 4 + 2] = (reg[i] >>> 8) & 0xff
    digest[i * 4 + 3] = reg[i] & 0xff
  }
  return digest
}

/**
 * 连续两次 SM3（bdms 对 URL 与盐值的处理方式）
 * @param message 待摘要的字符串或字节数组
 * @returns 32 字节摘要
 */
export const sm3Twice = (message: string | number[]): number[] => sm3(sm3(message))

/**
 * 十六进制摘要，仅用于测试与排查
 * @param message 待摘要的字符串或字节数组
 */
export const sm3Hex = (message: string | number[]): string =>
  sm3(message)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
