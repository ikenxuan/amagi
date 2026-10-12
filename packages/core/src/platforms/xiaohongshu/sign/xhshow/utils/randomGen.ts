import { createHash } from 'node:crypto'

import { CryptoConfig } from '../config'

const BASE36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'
const A1_CHARSET = 'abcdefghijklmnopqrstuvwxyz1234567890'

// Standard CRC32 (IEEE 802.3, poly 0xEDB88320), matching Python binascii.crc32
let STD_CRC32_TABLE: number[] | null = null
function stdCrc32(bytes: Uint8Array | Buffer): number {
  if (STD_CRC32_TABLE === null) {
    const tbl: number[] = new Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
      }
      tbl[n] = c >>> 0
    }
    STD_CRC32_TABLE = tbl
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = (STD_CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Convert a non-negative BigInt to a base36 string.
 */
function intToBase36(value: bigint): string {
  if (value === 0n) {
    return '0'
  }
  let result = ''
  const base = 36n
  while (value > 0n) {
    const remainder = value % base
    value = value / base
    result = BASE36_CHARS[Number(remainder)] + result
  }
  return result
}

export class RandomGenerator {
  private config: CryptoConfig

  constructor() {
    this.config = new CryptoConfig()
  }

  /**
   * Generate random byte array
   */
  generateRandomBytes(byteCount: number): number[] {
    return Array.from({ length: byteCount }, () => Math.floor(Math.random() * (this.config.MAX_BYTE + 1)))
  }

  /**
   * Generate random integer in range
   */
  generateRandomByteInRange(minVal: number, maxVal: number): number {
    return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal
  }

  /**
   * Generate 32-bit random integer
   */
  generateRandomInt(): number {
    return Math.floor(Math.random() * (this.config.MAX_32BIT + 1))
  }

  /**
   * Generate x-b3-traceid (16 random hex characters)
   */
  generateB3TraceId(): string {
    let result = ''
    for (let i = 0; i < this.config.B3_TRACE_ID_LENGTH; i++) {
      result += this.config.HEX_CHARS[Math.floor(Math.random() * this.config.HEX_CHARS.length)]
    }
    return result
  }

  /**
   * Generate x-xray-traceid (32 characters: 16 timestamp+seq + 16 random)
   */
  generateXrayTraceId(timestamp?: number, seq?: number): string {
    if (timestamp === undefined) {
      timestamp = Date.now()
    }
    if (seq === undefined) {
      seq = Math.floor(Math.random() * (this.config.XRAY_TRACE_ID_SEQ_MAX + 1))
    }

    // First 16 chars: XHS xray parameter uses timestamp bit operations
    const combined = (BigInt(timestamp) << BigInt(this.config.XRAY_TRACE_ID_TIMESTAMP_SHIFT)) | BigInt(seq)
    const part1 = combined.toString(16).padStart(this.config.XRAY_TRACE_ID_PART1_LENGTH, '0')

    // Last 16 chars: completely random
    let part2 = ''
    for (let i = 0; i < this.config.XRAY_TRACE_ID_PART2_LENGTH; i++) {
      part2 += this.config.HEX_CHARS[Math.floor(Math.random() * this.config.HEX_CHARS.length)]
    }

    return part1 + part2
  }

  /**
   * Generate a random ASCII string of the given length
   */
  static generateRandomAscii(length: number, charset: string = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)]
    }
    return result
  }

  /**
   * Generate an a1 cookie value (52 characters)
   */
  static generateA1(): string {
    const tsHex = Math.floor(Date.now()).toString(16)
    let randomStr = ''
    for (let i = 0; i < 30; i++) {
      randomStr += A1_CHARSET[Math.floor(Math.random() * A1_CHARSET.length)]
    }
    const aPart = tsHex + randomStr + '5' + '0' + '000'
    const crc = stdCrc32(Buffer.from(aPart)) >>> 0
    return (aPart + String(crc)).slice(0, 52)
  }

  /**
   * Generate web_id (32-character hex MD5) from an a1 cookie value
   */
  static generateWebId(a1: string): string {
    return createHash('md5').update(a1).digest('hex')
  }

  /**
   * Generate search_id for search endpoints (base36 of (timestamp_ms << 64) + random)
   */
  generateSearchId(): string {
    const timestampMs = BigInt(Date.now())
    const randomPart = BigInt(Math.ceil(0x7ffffffe * Math.random()))
    return intToBase36((timestampMs << 64n) + randomPart)
  }

  /**
   * Generate search request_id for search endpoints. Format: "{random}-{timestamp_ms}"
   */
  generateSearchRequestId(): string {
    const timestampMs = Date.now()
    const randomPart = Math.ceil(0x7ffffffe * Math.random())
    return `${randomPart}-${timestampMs}`
  }
}
