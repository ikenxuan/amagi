/**
 * Pure TypeScript xxHash32 implementation.
 *
 * Ported from the upstream Python `utils/hash.py`. Used by the x-rap-param
 * generator to compute integrity hashes over the request body and envelope.
 */

const MASK_32 = 0xffffffff

/**
 * 32-bit left rotation (unsigned)
 */
function rotl32(val: number, shift: number): number {
  val = val >>> 0
  return ((val << shift) | (val >>> (32 - shift))) >>> 0
}

/**
 * Compute the xxHash32 digest of the given bytes.
 *
 * @param data - Input bytes
 * @param seed - Optional seed (default 0)
 * @returns Unsigned 32-bit hash value
 */
export function xxh32(data: Uint8Array | Buffer, seed: number = 0): number {
  const buf = data
  const length = buf.length
  let pos = 0

  const prime1 = 0x9e3779b1
  const prime2 = 0x85ebca77
  const prime3 = 0xc2b2ae3d
  const prime4 = 0x27d4eb2f
  const prime5 = 0x165667b1

  let digest: number

  if (length >= 16) {
    let acc1 = (seed + prime1 + prime2) >>> 0
    let acc2 = (seed + prime2) >>> 0
    let acc3 = seed >>> 0
    let acc4 = (seed - prime1) >>> 0
    const end = length - 16

    while (pos <= end) {
      for (let accRef = 0; accRef < 4; accRef++) {
        const word = readU32LE(buf, pos)
        pos += 4
        if (accRef === 0) {
          acc1 = Math.imul(rotl32((acc1 + Math.imul(word, prime2)) >>> 0, 13), prime1) >>> 0
        } else if (accRef === 1) {
          acc2 = Math.imul(rotl32((acc2 + Math.imul(word, prime2)) >>> 0, 13), prime1) >>> 0
        } else if (accRef === 2) {
          acc3 = Math.imul(rotl32((acc3 + Math.imul(word, prime2)) >>> 0, 13), prime1) >>> 0
        } else {
          acc4 = Math.imul(rotl32((acc4 + Math.imul(word, prime2)) >>> 0, 13), prime1) >>> 0
        }
      }
    }
    digest = (rotl32(acc1, 1) + rotl32(acc2, 7) + rotl32(acc3, 12) + rotl32(acc4, 18)) >>> 0
  } else {
    digest = (seed + prime5) >>> 0
  }

  digest = (digest + length) >>> 0

  while (pos + 4 <= length) {
    const word = readU32LE(buf, pos)
    pos += 4
    digest = Math.imul(rotl32((digest + Math.imul(word, prime3)) >>> 0, 17), prime4) >>> 0
  }
  while (pos < length) {
    digest = Math.imul(rotl32((digest + Math.imul(buf[pos], prime5)) >>> 0, 11), prime1) >>> 0
    pos += 1
  }

  digest ^= digest >>> 15
  digest = Math.imul(digest, prime2) >>> 0
  digest ^= digest >>> 13
  digest = Math.imul(digest, prime3) >>> 0
  digest ^= digest >>> 16
  return (digest & MASK_32) >>> 0
}

/**
 * Read a 32-bit little-endian unsigned integer from a byte buffer.
 */
function readU32LE(buf: Uint8Array | Buffer, off: number): number {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0
}
