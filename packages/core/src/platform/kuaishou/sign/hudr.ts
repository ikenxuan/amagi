/**
 * 快手 `window.SECS` 的最小状态描述。
 */
export type KuaishouSecsState = {
  c?: number
  s?: string
}

/**
 * 生成 `HUDR_` 段所需的上下文参数。
 */
export type KuaishouHudrContext = {
  count: number
  scriptCount?: number
  secs?: KuaishouSecsState
}

/**
 * 快手 `HUDR_` 段的中间结果。
 */
export type KuaishouHudrResult = {
  body: string
  full: string
  infoCache: number[]
  maskedPayload: Uint8Array
  nextCount: number
}

const KUAISHOU_HUDR_PREFIX = 'HUDR_'
const KUAISHOU_HUDR_MASK_BYTE = 35
const KUAISHOU_HUDR_BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const KUAISHOU_HUDR_CHACHA_KEY = [
  4183807412,
  394484062,
  1106561997,
  2378328696,
  630790222,
  2546784104,
  2891127470,
  1922531795
] as const
const KUAISHOU_HUDR_CHACHA_NONCE = [
  2215853858,
  1643070585,
  1849059804
] as const

/** 将字符串转换为 Unicode code point 数组。 */
const toCodePointArray = (value: string): number[] => {
  return Array.from(value).map((char) => char.codePointAt(0) ?? 0)
}

/** 以小端序输出固定长度字节数组。 */
const toLittleEndianBytes = (value: number, size = 4): number[] => {
  if (size >= 4 && value >= Math.pow(2, 32)) {
    return [255, 255, 255, 255]
  }

  const result: number[] = []

  for (let index = 0; index <= size - 1; index++) {
    result[index] = value >>> (8 * index) & 255
  }

  return result
}

/** 对字节切片执行标准 Base64 编码。 */
const encodeBase64Slice = (bytes: Uint8Array, start: number, end: number): string => {
  const result: string[] = []

  for (let index = start; index < end; index += 3) {
    const value = ((bytes[index] << 16) & 0xff0000) + ((bytes[index + 1] << 8) & 0xff00) + (bytes[index + 2] & 255)
    result.push(
      KUAISHOU_HUDR_BASE64_ALPHABET[value >> 18 & 63],
      KUAISHOU_HUDR_BASE64_ALPHABET[value >> 12 & 63],
      KUAISHOU_HUDR_BASE64_ALPHABET[value >> 6 & 63],
      KUAISHOU_HUDR_BASE64_ALPHABET[value & 63]
    )
  }

  return result.join('')
}

/** 快手 `HUDR_` 使用的 Base64URL 变体编码。 */
const encodeBase64Url = (bytes: Uint8Array): string => {
  const result: string[] = []
  const remainder = bytes.length % 3
  const tripletLength = bytes.length - remainder

  for (let index = 0; index < tripletLength; index += 16383) {
    const end = tripletLength < index + 16383
      ? tripletLength
      : index + 16383
    result.push(encodeBase64Slice(bytes, index, end))
  }

  if (remainder === 1) {
    const value = bytes[bytes.length - 1]
    result.push(
      KUAISHOU_HUDR_BASE64_ALPHABET[value >> 2],
      KUAISHOU_HUDR_BASE64_ALPHABET[value << 4 & 63],
      '=='
    )
  } else if (remainder === 2) {
    const value = (bytes[bytes.length - 2] << 8) + bytes[bytes.length - 1]
    result.push(
      KUAISHOU_HUDR_BASE64_ALPHABET[value >> 10],
      KUAISHOU_HUDR_BASE64_ALPHABET[value >> 4 & 63],
      KUAISHOU_HUDR_BASE64_ALPHABET[value << 2 & 63],
      '='
    )
  }

  return result
    .join('')
    .replace(/[+/=]/g, (char) => {
      if (char === '+') return '-'
      if (char === '/') return '_'
      return '.'
    })
}

/**
 * 快手 `HUDR_` 所用的 ChaCha20 变体实现。
 *
 * 该实现并非通用密码库封装，而是为对齐页面 `$encode`
 * 数据流而最小化保留的局部算法。
 */
class KuaishouChaChaCipher {
  private wordIndex = 0
  private readonly state = new Array<number>(16).fill(0)

  constructor (
    private readonly key: readonly number[],
    private readonly nonce: readonly number[]
  ) {}

  private rotateLeft (value: number, shift: number): number {
    return ((value << shift) | (value >>> (32 - shift))) >>> 0
  }

  private quarterRound (target: number[], a: number, b: number, c: number, d: number): void {
    target[a] = (target[a] + target[b]) >>> 0
    target[d] ^= target[a]
    target[d] = this.rotateLeft(target[d], 16)

    target[c] = (target[c] + target[d]) >>> 0
    target[b] ^= target[c]
    target[b] = this.rotateLeft(target[b], 12)

    target[a] = (target[a] + target[b]) >>> 0
    target[d] ^= target[a]
    target[d] = this.rotateLeft(target[d], 8)

    target[c] = (target[c] + target[d]) >>> 0
    target[b] ^= target[c]
    target[b] = this.rotateLeft(target[b], 7)
  }

  private refillBlock (): number[] {
    const working = this.state.slice()

    for (let round = 0; round < 20; round += 2) {
      this.quarterRound(working, 0, 4, 8, 12)
      this.quarterRound(working, 1, 5, 9, 13)
      this.quarterRound(working, 2, 6, 10, 14)
      this.quarterRound(working, 3, 7, 11, 15)
      this.quarterRound(working, 0, 5, 10, 15)
      this.quarterRound(working, 1, 6, 11, 12)
      this.quarterRound(working, 2, 7, 8, 13)
      this.quarterRound(working, 3, 4, 9, 14)
    }

    const mixedState = new Array<number>(16).fill(0)

    for (let index = 0; index < 16; index++) {
      mixedState[index] = (working[index] + this.state[index]) >>> 0
    }

    return mixedState
  }

  encrypt (input: number[] | Uint8Array): Uint8Array {
    this.wordIndex = 0
    this.state[0] = 394484062
    this.state[1] = 2378328696
    this.state[2] = 630790222
    this.state[3] = 1922531795

    for (let index = 0; index < 8; index++) {
      this.state[index + 4] = this.key[index] >>> 0
    }

    this.state[12] = 1
    this.state[13] = this.nonce[0] >>> 0
    this.state[14] = this.nonce[1] >>> 0
    this.state[15] = this.nonce[2] >>> 0
    let mixedState = this.refillBlock()

    const output = new Uint8Array(input.length)

    for (let index = 0; index < input.length; index++) {
      if (this.wordIndex === 64) {
        this.state[12] = (this.state[12] + 1) >>> 0
        mixedState = this.refillBlock()
        this.wordIndex = 0
      }

      const word = mixedState[this.wordIndex >> 2]
      const keystreamByte = word >>> ((this.wordIndex & 3) << 3) & 255
      this.wordIndex += 1
      output[index] = input[index] ^ keystreamByte
    }

    return output
  }
}

/**
 * 构造 `HUDR_` 头部中的 `infoCache` 字段。
 *
 * @param scriptCount - 页面脚本数量
 * @returns `HUDR_` 载荷中的脚本信息缓存字节
 */
export const buildKuaishouHudrInfoCache = (scriptCount = 0): number[] => {
  return [68, 0].concat(toLittleEndianBytes(scriptCount, 4))
}

/**
 * 构造快手 `HUDR_` 原始载荷。
 *
 * @param context - 生成 `HUDR_` 所需的上下文参数
 * @returns 尚未异或和加密的原始字节载荷
 */
export const buildKuaishouHudrPayload = (context: KuaishouHudrContext): number[] => {
  const stackTail = context.secs?.s ?? ''
  const secsCount = context.secs?.c ?? 0
  const count = context.count || 0

  return [45, 61, 0, 2]
    .concat(buildKuaishouHudrInfoCache(context.scriptCount))
    .concat([112, 0], toLittleEndianBytes(count, 4))
    .concat([114, 1], toLittleEndianBytes(stackTail.length, 2), toCodePointArray(stackTail))
    .concat([115, 0], toLittleEndianBytes(secsCount, 4))
}

/**
 * 对 `HUDR_` 原始载荷执行页面同款掩码异或。
 *
 * @param payload - 原始 `HUDR_` 字节载荷
 * @returns 掩码处理后的字节数组
 */
export const maskKuaishouHudrPayload = (payload: number[]): Uint8Array => {
  const masked = new Uint8Array(payload.length)

  for (let index = 0; index < payload.length; index++) {
    masked[index] = KUAISHOU_HUDR_MASK_BYTE ^ payload[index]
  }

  return masked
}

/**
 * 推导快手签名中的 `HUDR_` 段。
 *
 * @param context - 生成 `HUDR_` 所需的上下文参数
 * @returns `HUDR_` 的完整结果及若干中间态，便于对拍与调试
 */
export const deriveKuaishouHudrBody = (context: KuaishouHudrContext): KuaishouHudrResult => {
  const payload = buildKuaishouHudrPayload(context)
  const maskedPayload = maskKuaishouHudrPayload(payload)
  const cipher = new KuaishouChaChaCipher(
    KUAISHOU_HUDR_CHACHA_KEY,
    KUAISHOU_HUDR_CHACHA_NONCE
  )
  const encrypted = cipher.encrypt(maskedPayload)
  const body = encodeBase64Url(encrypted)

  return {
    body,
    full: `${KUAISHOU_HUDR_PREFIX}${body}`,
    infoCache: buildKuaishouHudrInfoCache(context.scriptCount),
    maskedPayload,
    nextCount: context.count + 1
  }
}
