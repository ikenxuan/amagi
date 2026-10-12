/**
 * Sharding key generation for the `xy-direction` request header.
 *
 * Ported from the upstream Python `utils/sharding.py`. When a `user_id` is
 * provided, the key is derived deterministically via a MurmurHash3-x86-32
 * variant; otherwise a random value in [10, 100] is returned.
 */

const C1 = 0xcc9e2d51
const C2 = 0x1b873593

/**
 * 32-bit left rotation (unsigned)
 */
function rotl32(x: number, r: number): number {
  x = x >>> 0
  return ((x << r) | (x >>> (32 - r))) >>> 0
}

/**
 * Compute the sharding key for the `xy-direction` header.
 *
 * @param userId - Optional user id. If omitted, a random value in [10, 100].
 * @returns Sharding key
 */
export function getShardingKey(userId?: string | null): number {
  if (userId === null || userId === undefined) {
    // Python random.randint(10, 100) is inclusive on both ends
    return Math.floor(Math.random() * (100 - 10 + 1)) + 10
  }

  const data = Buffer.from(userId, 'utf-8')
  const length = data.length
  let r = 151488

  const nblocks = Math.floor(length / 4)
  for (let o = 0; o < nblocks; o++) {
    const i = 4 * o
    let u = (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0
    u = Math.imul(u, C1) >>> 0
    u = rotl32(u, 15)
    u = Math.imul(u, C2) >>> 0
    r = (r ^ u) >>> 0
    r = rotl32(r, 13)
    r = (Math.imul(r, 5) + 0xe6546b64) >>> 0
  }

  const s = 4 * nblocks
  let c = 0
  const rem = length % 4
  if (rem >= 3) {
    c ^= data[s + 2] << 16
  }
  if (rem >= 2) {
    c ^= data[s + 1] << 8
  }
  if (rem >= 1) {
    c ^= data[s]
    c = Math.imul(c, C1) >>> 0
    c = rotl32(c, 15)
    c = Math.imul(c, C2) >>> 0
    r = (r ^ c) >>> 0
  }

  r = (r ^ length) >>> 0
  r ^= r >>> 16
  r = Math.imul(r, 0x85ebca6b) >>> 0
  r ^= r >>> 13
  r = Math.imul(r, 0xc2b2ae35) >>> 0
  r ^= r >>> 16
  r = r >>> 0

  return (r % 100) + 1
}
