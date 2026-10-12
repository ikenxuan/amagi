/**
 * Custom CRC32 helper class.
 *
 * This implements a JavaScript-style CRC32 variant compatible with:
 *   (-1 ^ c ^ 0xEDB88320) >>> 0
 * where `c` is the intermediate CRC state produced by the core CRC32 loop.
 */

const MASK32 = 0xffffffff
const POLY = 0xedb88320

let TABLE: number[] | null = null

function ensureTable(): number[] {
  if (TABLE !== null) {
    return TABLE
  }

  const tbl: number[] = new Array(256)
  for (let d = 0; d < 256; d++) {
    let r = d
    for (let i = 0; i < 8; i++) {
      r = r & 1 ? (r >>> 1) ^ POLY : r >>> 1
      r = r >>> 0 // Ensure unsigned
    }
    tbl[d] = r
  }
  TABLE = tbl
  return TABLE
}

function crc32Core(data: string | number[], stringMode: 'js' | 'utf8' = 'js'): number {
  const table = ensureTable()
  let c = MASK32

  let bytes: number[]
  if (typeof data === 'string') {
    if (stringMode === 'utf8') {
      bytes = Array.from(Buffer.from(data, 'utf8'))
    } else {
      // JS mode: charCodeAt & 0xFF
      bytes = []
      for (let i = 0; i < data.length; i++) {
        bytes.push(data.charCodeAt(i) & 0xff)
      }
    }
  } else {
    bytes = data.map((b) => b & 0xff)
  }

  for (const b of bytes) {
    c = (table[((c & 0xff) ^ b) & 0xff] ^ (c >>> 8)) >>> 0
  }

  return c
}

function toSigned32(u: number): number {
  return u & 0x80000000 ? u - 0x100000000 : u
}

export class CRC32 {
  /**
   * JavaScript-style CRC32 public entry.
   *
   * This matches the JS expression:
   *   (-1 ^ c ^ 0xEDB88320) >>> 0
   */
  static crc32JsInt(data: string | number[], options: { stringMode?: 'js' | 'utf8'; signed?: boolean } = {}): number {
    const { stringMode = 'js', signed = true } = options
    const c = crc32Core(data, stringMode)
    const u = (MASK32 ^ c ^ POLY) >>> 0
    return signed ? toSigned32(u) : u
  }
}
