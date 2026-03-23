const KUAISHOU_BLAKE2S_IV = [
  2837534710,
  2845986804,
  2436420605,
  706843635,
  719254516,
  2557931286,
  2596197199,
  2432949778
] as const

const KUAISHOU_BLAKE2S_SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]
] as const

const KUAISHOU_CTS_STATE_VECTOR = new Int8Array([
  98, 0, 0, 128,
  49, 117, 185, 253,
  224, 172, 104, 36,
  223, 155, 87, 19,
  32, 0, 0, 64,
  2, 0, 0, 16,
  255, 255, 255, 127,
  255, 255, 255, 63,
  0, 0, 0, 240,
  0, 0, 0, 192,
  0, 0, 0, 128,
  255, 255, 255, 15
])

const rotateRight = (value: number, shift: number): number => {
  return ((value >>> shift) | (value << (32 - shift))) >>> 0
}

const toUtf8Int8Array = (value: string): Int8Array => {
  return new Int8Array(
    unescape(encodeURIComponent(value))
      .split('')
      .map((char) => char.charCodeAt(0) || 0)
  )
}

const toHex32 = (value: number): string => {
  return (value >>> 0).toString(16).padStart(8, '0')
}

const blake2sQuarterRound = (
  state: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  y: number
): void => {
  state[a] = (state[a] + state[b] + x) >>> 0
  state[d] = rotateRight(state[d] ^ state[a], 16)
  state[c] = (state[c] + state[d]) >>> 0
  state[b] = rotateRight(state[b] ^ state[c], 12)
  state[a] = (state[a] + state[b] + y) >>> 0
  state[d] = rotateRight(state[d] ^ state[a], 8)
  state[c] = (state[c] + state[d]) >>> 0
  state[b] = rotateRight(state[b] ^ state[c], 7)
}

const blake2sCompress = (
  hash: number[],
  words: number[],
  offset: number,
  counter: number,
  length: number,
  isLastBlock: boolean
): number[] => {
  const work = new Array<number>(16).fill(0)
  const block = new Array<number>(16).fill(0)

  for (let index = 0; index < 8; index++) {
    work[index] = hash[index] >>> 0
    work[index + 8] = KUAISHOU_BLAKE2S_IV[index] >>> 0
  }

  work[12] ^= counter >>> 0

  if (isLastBlock) {
    work[14] ^= 0xffffffff
  }

  for (let index = 0; index < length; index++) {
    block[index % 16] ^= words[offset + index] >>> 0
  }

  for (const sigma of KUAISHOU_BLAKE2S_SIGMA) {
    blake2sQuarterRound(work, 0, 4, 8, 12, block[sigma[0]], block[sigma[1]])
    blake2sQuarterRound(work, 1, 5, 9, 13, block[sigma[2]], block[sigma[3]])
    blake2sQuarterRound(work, 2, 6, 10, 14, block[sigma[4]], block[sigma[5]])
    blake2sQuarterRound(work, 3, 7, 11, 15, block[sigma[6]], block[sigma[7]])
    blake2sQuarterRound(work, 0, 5, 10, 15, block[sigma[8]], block[sigma[9]])
    blake2sQuarterRound(work, 1, 6, 11, 12, block[sigma[10]], block[sigma[11]])
    blake2sQuarterRound(work, 2, 7, 8, 13, block[sigma[12]], block[sigma[13]])
    blake2sQuarterRound(work, 3, 4, 9, 14, block[sigma[14]], block[sigma[15]])
  }

  for (let index = 0; index < 8; index++) {
    hash[index] = (hash[index] ^ work[index] ^ work[index + 8]) >>> 0
  }

  return hash
}

const deriveB2hasWords = (value: string): number[] => {
  const utf8 = toUtf8Int8Array(value)
  const padding = utf8.length % 4 === 0
    ? 0
    : 4 - utf8.length % 4
  const padded = new Int8Array(utf8.length + padding)

  for (let index = 0; index < utf8.length; index++) {
    padded[index] = utf8[index]
  }

  const words = new Array<number>(padded.length / 4)

  for (let index = 0; index < padded.length; index += 4) {
    words[index / 4] = new Int32Array(padded.slice(index, index + 4).buffer)[0]
  }

  return words
}

const deriveB2hasHash = (words: number[]): number[] => {
  const hash = KUAISHOU_BLAKE2S_IV.slice()
  hash[0] ^= 16842784

  let offset = 0
  let length = words.length
  let counter = 0

  while (length > 64) {
    length -= 64
    counter += 64
    blake2sCompress(hash, words, offset, counter, 64, false)
    offset += 64
  }

  return blake2sCompress(hash, words, offset, counter + length, length, true)
}

/**
 * 计算快手页面中的 `b2has` 字符串。
 *
 * 这是后续 `b2sa` / `cts` 链路的起点。
 *
 * @param value - 原始输入字符串
 * @returns `b2has` 结果字符串
 */
export const deriveKuaishouB2has = (value: string): string => {
  return deriveB2hasHash(deriveB2hasWords(value))
    .map(toHex32)
    .join('')
}

/**
 * 将输入字符串转换为快手 `b2sa` 所需的字节数组。
 *
 * @param value - 原始输入字符串
 * @returns `b2has` 结果转 UTF-8 后的 Int8Array
 */
export const deriveKuaishouB2sa = (value: string): Int8Array => {
  return toUtf8Int8Array(deriveKuaishouB2has(value))
}

type KuaishouCtsState = {
  E: number
  b: number
  c: number
  d: number
  f: number
  h: number
  l: number
  m: number
  p: number
  s: number
  u: number
  y: number
}

const createKuaishouCtsState = (): KuaishouCtsState => {
  return {
    s: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(12, 16).buffer)[0],
    u: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(8, 12).buffer)[0],
    c: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(4, 8).buffer)[0],
    l: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(0, 4).buffer)[0],
    p: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(16, 20).buffer)[0],
    f: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(20, 24).buffer)[0],
    d: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(24, 28).buffer)[0],
    y: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(28, 32).buffer)[0],
    h: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(44, 48).buffer)[0],
    E: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(40, 44).buffer)[0],
    m: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(36, 40).buffer)[0],
    b: new Int32Array(KUAISHOU_CTS_STATE_VECTOR.slice(32, 36).buffer)[0]
  }
}

const seedKuaishouCtsState = (state: KuaishouCtsState, seed: string): void => {
  const chars = new Int8Array(
    seed
      .split('')
      .map((char) => char.codePointAt(0) ?? 0)
  ).slice(0, seed.length)

  for (let index = 0; index < 4; index++) {
    state.s = (state.s <<= 8) | chars[index + 4]
    state.u = (state.u <<= 8) | chars[index + 4]
    state.c = (state.c <<= 8) | chars[index + 4]
  }

  if (state.s === 0) state.s = 324508639
  if (state.u === 0) state.u = 610839776
  if (state.c === 0) state.c = 4256789809
}

const deriveKuaishouCtsByte = (state: KuaishouCtsState, value: number): number => {
  let result = 0
  let rightBit = 1 & state.u
  let leftBit = 1 & state.c

  for (let index = 0; index < 8; index++) {
    if (1 & state.s) {
      state.s = state.s ^ state.l >> 1 & 4294967295 | state.E
      rightBit = 1 & state.u
        ? (state.u = state.u ^ state.p >> 1 & 4294967295 | state.m, 1)
        : (state.u = state.u >> 1 & 4294967295 & state.y, 0)
    } else {
      state.s = state.s >> 1 & 4294967295 & state.d
      leftBit = 1 & state.c
        ? (state.c = state.c ^ state.f >> 1 & 4294967295 | state.b, 1)
        : (state.c = state.c >> 1 & 4294967295 & state.h, 0)
    }

    const mixed = result << 1 & 4294967295 | rightBit ^ leftBit
    result = mixed > 127
      ? mixed - 256
      : mixed < -128
        ? mixed + 256
        : mixed
  }

  return value ^ result + 3
}

/**
 * 执行快手页面中的 `cts` 字节流变换。
 *
 * 该变换会作用在 `b2sa` 的输出上，随后被 `$HE_` 使用。
 *
 * @param input - 输入字节数组
 * @returns 变换后的字节数组
 */
export const deriveKuaishouCts = (input: Int8Array): Int8Array => {
  const state = createKuaishouCtsState()
  seedKuaishouCtsState(state, 'Vuz4fCHxn1CO')

  const result = new Int8Array(input.length)

  for (let index = 0; index < input.length; index++) {
    result[index] = deriveKuaishouCtsByte(state, input[index])
  }

  return result
}

/**
 * 将字节数组编码为小写 hex 字符串。
 *
 * @param bytes - 任意可按字节访问的数组
 * @returns 小写 hex 字符串
 */
export const bytesToLowerHex = (bytes: ArrayLike<number>): string => {
  let result = ''

  for (const byte of Array.from(bytes)) {
    const value = byte & 255
    result += value === 0
      ? '00'
      : `${value < 16 ? '0' : ''}${value.toString(16)}`
  }

  return result
}

/**
 * 将 hex 字符串还原为带符号字节数组。
 *
 * @param value - 偶数字节长度的 hex 字符串
 * @returns 带符号 byte 数组
 */
export const hexToSignedBytes = (value: string): number[] => {
  const result: number[] = []

  for (let index = 0; index < value.length; index += 2) {
    const parsed = parseInt(value.slice(index, index + 2), 16)
    const range = Math.pow(2, value.slice(index, index + 2).length / 2 * 8)
    result.push(parsed > range / 2 - 1 ? parsed - range : parsed)
  }

  return result
}

/**
 * 对两个字节数组执行循环异或。
 *
 * @param left - 被处理的字节数组
 * @param right - 异或掩码字节数组
 * @returns 异或后的 Int8Array
 */
export const xorByteArrays = (left: ArrayLike<number>, right: ArrayLike<number>): Int8Array => {
  let index = 0
  const result = new Int8Array(left.length)

  while (index < left.length) {
    for (let rightIndex = 0; rightIndex < right.length && index < left.length; rightIndex++) {
      result[index] = left[index] ^ (255 & right[rightIndex])
      index += 1
    }
  }

  return result
}

/**
 * 将数值编码为固定长度的小端 hex。
 *
 * @param value - 原始数值
 * @param size - 输出字节长度
 * @returns 小端序 hex 字符串
 */
export const toLittleEndianHex = (value: number | bigint, size: number): string => {
  const normalized = BigInt.asUintN(size * 8, typeof value === 'bigint' ? value : BigInt(Math.trunc(value)))
  let result = ''

  for (let index = 0; index < size; index++) {
    const byte = Number(normalized >> BigInt(8 * index) & 255n)
    result += byte.toString(16).padStart(2, '0')
  }

  return result
}

/**
 * 计算快手 `$HE_` 所使用的 8-bit LRC 校验值。
 *
 * @param sourceHex - 原始 hex 字符串
 * @returns 单字节 LRC 的 hex 表示
 */
export const computeKuaishouLrcHex = (sourceHex: string): string => {
  const sum = hexToSignedBytes(sourceHex).reduce((total, value) => total + (value & 255), 0)
  return ((-sum) & 255).toString(16).padStart(2, '0')
}

/**
 * 对 `$HE_` 的 preHex + checksum 执行最终变换。
 *
 * 页面实现会以最后一个字节为 key，对前面的字节逐个异或，
 * 最后再整体转回小写 hex。
 *
 * @param prefixHex - 不含最终 LRC 的前缀 hex
 * @param checksumHex - 最终 LRC hex
 * @returns `$HE_` 最终输出的 hex 字符串
 */
export const transformKuaishouHeHex = (prefixHex: string, checksumHex: string): string => {
  const input = hexToSignedBytes(`${prefixHex}${checksumHex}`)
  const output = new Int8Array(input.length)
  const xorKey = input[input.length - 1]

  for (let index = 0; index < input.length - 1; index++) {
    output[index] = input[index] ^ xorKey
  }

  output[input.length - 1] = xorKey
  return bytesToLowerHex(output)
}
