/**
 * SM3 哈希（GB/T 32905-2016），纯 TS 实现。
 *
 * 抖音的 a_bogus 用它摘要 query / body / User-Agent。这个文件是移植件，
 * 来源是 Douyin_TikTok_Download_API 的 `signing/native/sm3.py`（Apache-2.0），
 * 与本仓库的 GPL-3.0 兼容。
 *
 * ## 为什么不用 passport/sm3.ts
 *
 * 那个是登录侧的另一份 SM3，入口收 `string` 并按 `charCodeAt` 逐字符取字节 ——
 * 对中文会与 UTF-8 不同。a_bogus 要摘的是 query 与 base64 串（纯 ASCII），
 * 但 UA 链上要摘要的是**按 JS 语义切出来的字节**，两份混用迟早出错，所以
 * 签名侧自带一份以字节为入口的实现，不复用。
 *
 * ## 移植时改了什么
 *
 * 只改了整数语义：Python 的 `& 0xFFFFFFFF` 在 JS 里必须写成 `>>> 0`，
 * 否则位运算的结果是带符号 32 位整数，`~x` 与算术右移都会带进符号位。
 * 摘要字节输出与 Python 逐字节一致。
 */

/** 32 位掩码，JS 位运算全是带符号的，每步之后都要用它收回无符号域 */
const MASK = 0xffffffff

/** SM3 初始向量 */
export const SM3_IV: readonly number[] = [
  0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600, 0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e
]

const T0 = 0x79cc4519
const T1 = 0x7a879d8a

/** 循环左移。`bits % 32 === 0` 时 JS 的移位计数会自动取模，结果仍正确 */
const rotl = (value: number, bits: number): number => {
  const n = bits % 32
  return (((value << n) & MASK) | (value >>> (32 - n))) >>> 0
}

const ff = (index: number, x: number, y: number, z: number): number =>
  index < 16 ? (x ^ y ^ z) >>> 0 : ((x & y) | (x & z) | (y & z)) >>> 0

const gg = (index: number, x: number, y: number, z: number): number =>
  index < 16 ? (x ^ y ^ z) >>> 0 : ((x & y) | (~x & z)) >>> 0

/** 消息扩展：16 个字扩到 68 个，再派生 64 个 `w1` */
const expand = (block: readonly number[]): { w: number[]; w1: number[] } => {
  const w = block.slice(0, 16)
  for (let i = 16; i < 68; i++) {
    let x = (w[i - 16] ^ w[i - 9] ^ rotl(w[i - 3], 15)) >>> 0
    x = (x ^ rotl(x, 15) ^ rotl(x, 23)) >>> 0
    w.push((x ^ rotl(w[i - 13], 7) ^ w[i - 6]) >>> 0)
  }
  const w1: number[] = []
  for (let i = 0; i < 64; i++) w1.push((w[i] ^ w[i + 4]) >>> 0)
  return { w, w1 }
}

/** 压缩函数：8 字状态与一个 512 位分组混合 */
const compress = (state: readonly number[], block: readonly number[]): number[] => {
  const { w, w1 } = expand(block)
  let [a, b, c, d, e, f, g, h] = state
  for (let j = 0; j < 64; j++) {
    const t = j < 16 ? T0 : T1
    const ss1 = rotl((rotl(a, 12) + e + rotl(t, j)) & MASK, 7)
    const ss2 = (ss1 ^ rotl(a, 12)) >>> 0
    const tt1 = (ff(j, a, b, c) + d + ss2 + w1[j]) & MASK
    const tt2 = (gg(j, e, f, g) + h + ss1 + w[j]) & MASK
    d = c
    c = rotl(b, 9)
    b = a
    a = tt1
    h = g
    g = rotl(f, 19)
    f = e
    e = (tt2 ^ rotl(tt2, 9) ^ rotl(tt2, 17)) >>> 0
  }
  return state.map((word, index) => (word ^ [a, b, c, d, e, f, g, h][index]) >>> 0)
}

/** 填充：补 `0x80`、补零到 56 mod 64、末尾写 64 位大端比特长度 */
const pad = (message: readonly number[]): number[] => {
  const bitLength = message.length * 8
  const padded = message.slice()
  padded.push(0x80)
  while (padded.length % 64 !== 56) padded.push(0)
  // 高位用除法取，低位用取模取，避免 BigInt；本仓库的消息长度远不到 2^32
  const high = Math.floor(bitLength / 0x100000000)
  const low = bitLength >>> 0
  padded.push((high >>> 24) & 0xff, (high >>> 16) & 0xff, (high >>> 8) & 0xff, high & 0xff)
  padded.push((low >>> 24) & 0xff, (low >>> 16) & 0xff, (low >>> 8) & 0xff, low & 0xff)
  return padded
}

/**
 * 计算 SM3 摘要。
 * @param message - 待摘要的字节
 * @returns 32 字节摘要
 */
export const sm3Hash = (message: readonly number[]): number[] => {
  const padded = pad(message)
  let state = SM3_IV.slice()
  for (let offset = 0; offset < padded.length; offset += 64) {
    const block: number[] = []
    for (let i = 0; i < 16; i++) {
      const at = offset + i * 4
      block.push(((padded[at] << 24) | (padded[at + 1] << 16) | (padded[at + 2] << 8) | padded[at + 3]) >>> 0)
    }
    state = compress(state, block)
  }
  const out: number[] = []
  for (const word of state) out.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff)
  return out
}

/** 摘要的十六进制形式，便于与公开测试向量对照 */
export const sm3Hexdigest = (message: readonly number[]): string =>
  sm3Hash(message)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

/**
 * 摘要为 32 个整数的数组，与 a_bogus 内部各处取字节的方式对齐。
 *
 * 字符串按 **UTF-8** 编码后摘要（与 `sm3.py` 的 `sm3_to_array` 一致）。
 * 注意 a_bogus 里另有一处 `jsBytes`，那个走的是 JS `charCodeAt` 语义，
 * 两者不可互换 —— 见 `a_bogus.ts` 的说明。
 * @param data - 字符串、字节数组或整数数组
 * @returns 32 个 0..255 的整数
 */
export const sm3ToArray = (data: string | readonly number[] | Uint8Array): number[] =>
  sm3Hash(typeof data === 'string' ? Array.from(new TextEncoder().encode(data)) : Array.from(data))
