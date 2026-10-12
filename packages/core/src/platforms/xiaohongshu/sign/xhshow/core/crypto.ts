import { CryptoConfig } from '../config'
import type { SignState } from '../session'
import { BitOperations, Base64Encoder, HexProcessor, RandomGenerator } from '../utils'

export class CryptoProcessor {
  config: CryptoConfig
  bitOps: BitOperations
  b64encoder: Base64Encoder
  hexProcessor: HexProcessor
  randomGen: RandomGenerator

  constructor(config?: CryptoConfig) {
    this.config = config || new CryptoConfig()
    this.bitOps = new BitOperations(this.config)
    this.b64encoder = new Base64Encoder(this.config)
    this.hexProcessor = new HexProcessor()
    this.randomGen = new RandomGenerator()
  }

  private intToLeBytes(val: number, length: number = 4): number[] {
    const arr: number[] = []
    for (let i = 0; i < length; i++) {
      arr.push(val & 0xff)
      val = Math.floor(val / 256)
    }
    return arr
  }

  /**
   * 32-bit left rotation
   */
  private rotateLeft(val: number, n: number): number {
    return ((val << n) | (val >>> (32 - n))) >>> 0
  }

  /**
   * Custom hash function for a3 field generation
   * Input: byte array (must be multiple of 8)
   * Output: 16-byte array
   */
  private customHashV2(inputBytes: number[]): number[] {
    let [s0, s1, s2, s3] = this.config.HASH_IV
    const length = inputBytes.length

    s0 ^= length
    s1 ^= length << 8
    s2 ^= length << 16
    s3 ^= length << 24

    for (let i = 0; i < Math.floor(length / 8); i++) {
      const offset = i * 8
      // Read two 32-bit little-endian integers
      const v0 =
        (inputBytes[offset] | (inputBytes[offset + 1] << 8) | (inputBytes[offset + 2] << 16) | (inputBytes[offset + 3] << 24)) >>> 0
      const v1 =
        (inputBytes[offset + 4] | (inputBytes[offset + 5] << 8) | (inputBytes[offset + 6] << 16) | (inputBytes[offset + 7] << 24)) >>> 0

      s0 = this.rotateLeft(((s0 + v0) & this.config.MAX_32BIT) ^ s2, 7)
      s1 = this.rotateLeft(((v0 ^ s1) + s3) & this.config.MAX_32BIT, 11)
      s2 = this.rotateLeft(((s2 + v1) & this.config.MAX_32BIT) ^ s0, 13)
      s3 = this.rotateLeft(((s3 ^ v1) + s1) & this.config.MAX_32BIT, 17)
    }

    const t0 = s0 ^ length
    const t1 = s1 ^ t0
    const t2 = (s2 + t1) & this.config.MAX_32BIT
    const t3 = s3 ^ t2

    const rotT0 = this.rotateLeft(t0, 9)
    const rotT1 = this.rotateLeft(t1, 13)
    const rotT2 = this.rotateLeft(t2, 17)
    const rotT3 = this.rotateLeft(t3, 19)

    s0 = (rotT0 + rotT2) & this.config.MAX_32BIT
    s1 = rotT1 ^ rotT3
    s2 = (rotT2 + s0) & this.config.MAX_32BIT
    s3 = rotT3 ^ s1

    const result: number[] = []
    for (const s of [s0, s1, s2, s3]) {
      result.push(...this.intToLeBytes(s, 4))
    }
    return result
  }

  /**
   * Build 144-byte payload array (mns0301 version)
   *
   * @param hexParameter - 32-char hex (MD5 of uri+data), used for the MD5 XOR segment
   * @param hexMd5Path - 32-char hex path hash (GET: MD5 of uri+params, POST: MD5 of uri)
   * @param a1Value - a1 value from cookies
   * @param appIdentifier - Application identifier, default "xhs-pc-web"
   * @param stringParam - String parameter (URI+data, used for length calculation)
   * @param timestamp - Unix timestamp in seconds (defaults to current time)
   * @param signState - Optional session state
   */
  buildPayloadArray(
    hexParameter: string,
    hexMd5Path: string,
    a1Value: string,
    appIdentifier: string = 'xhs-pc-web',
    stringParam: string = '',
    timestamp?: number,
    signState?: SignState
  ): number[] {
    if (timestamp === undefined) {
      timestamp = Date.now() / 1000
    }

    const seed = this.randomGen.generateRandomInt()
    const seedByte = seed & 0xff

    const payload: number[] = []

    // Version bytes
    payload.push(...this.config.VERSION_BYTES)

    // Seed (4 bytes little-endian)
    payload.push(...this.intToLeBytes(seed, 4))

    // Current timestamp (8 bytes little-endian)
    const tsBytes = this.intToLeBytes(Math.floor(timestamp * 1000), this.config.TIMESTAMP_LE_LENGTH)
    payload.push(...tsBytes)

    // Session state or random values
    if (signState) {
      payload.push(...this.intToLeBytes(signState.pageLoadTimestamp, this.config.TIMESTAMP_LE_LENGTH))
      payload.push(...this.intToLeBytes(signState.sequenceValue, 4))
      payload.push(...this.intToLeBytes(signState.windowPropsLength, 4))
      payload.push(...this.intToLeBytes(signState.uriLength, 4))
    } else {
      const timeOffset = this.randomGen.generateRandomByteInRange(
        this.config.ENV_FINGERPRINT_TIME_OFFSET_MIN,
        this.config.ENV_FINGERPRINT_TIME_OFFSET_MAX
      )
      const effectiveTsMs = Math.floor((timestamp - timeOffset) * 1000)
      payload.push(...this.intToLeBytes(effectiveTsMs, this.config.TIMESTAMP_LE_LENGTH))

      const sequenceValue = this.randomGen.generateRandomByteInRange(this.config.SEQUENCE_VALUE_MIN, this.config.SEQUENCE_VALUE_MAX)
      payload.push(...this.intToLeBytes(sequenceValue, 4))

      const windowPropsLength = this.randomGen.generateRandomByteInRange(
        this.config.WINDOW_PROPS_LENGTH_MIN,
        this.config.WINDOW_PROPS_LENGTH_MAX
      )
      payload.push(...this.intToLeBytes(windowPropsLength, 4))

      const uriLength = Buffer.from(stringParam, 'utf-8').length
      payload.push(...this.intToLeBytes(uriLength, 4))
    }

    // MD5 XOR segment (8 bytes)
    const md5Bytes = Buffer.from(hexParameter, 'hex')
    for (let i = 0; i < this.config.MD5_XOR_LENGTH; i++) {
      payload.push(md5Bytes[i] ^ seedByte)
    }

    // A1 value (length + 52 bytes)
    const a1Bytes = Buffer.from(a1Value, 'utf-8').subarray(0, this.config.A1_LENGTH)
    const a1Padded = Buffer.alloc(this.config.A1_LENGTH)
    a1Bytes.copy(a1Padded)
    payload.push(a1Padded.length)
    payload.push(...Array.from(a1Padded))

    // App identifier (length + 10 bytes)
    const appBytes = Buffer.from(appIdentifier, 'utf-8').subarray(0, this.config.APP_ID_LENGTH)
    const appPadded = Buffer.alloc(this.config.APP_ID_LENGTH)
    appBytes.copy(appPadded)
    payload.push(appPadded.length)
    payload.push(...Array.from(appPadded))

    // Part11: Environment detection (16 bytes)
    const part11: number[] = [1, seedByte ^ this.config.ENV_TABLE[0]]
    for (let i = 1; i < 15; i++) {
      part11.push(this.config.ENV_TABLE[i] ^ this.config.ENV_CHECKS_DEFAULT[i])
    }
    payload.push(...part11)

    // A3 field: path hash (20 bytes = 4 prefix + 16 hash)
    // The caller supplies the precomputed 32-char hex path hash.
    const md5PathBytes: number[] = []
    for (let i = 0; i < 32; i += 2) {
      md5PathBytes.push(parseInt(hexMd5Path.substring(i, i + 2), 16))
    }

    const a3Hash = this.customHashV2([...tsBytes, ...md5PathBytes])
    const a3Field = [...this.config.A3_PREFIX, ...a3Hash.map((b) => b ^ seedByte)]
    payload.push(...a3Field)

    return payload
  }
}
