import { randomBytes } from 'node:crypto'

import { sm3ToArray } from '../../sign/sm3'

/** 桌面 IM Passport a_bogus（jumpbyte-bot internal/abogus）专用查表 */
const TABLES = {
  s3: 'ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe',
  s4: 'Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe'
} as const

const SALT = 'dhzx'

/** 与源文件 `encodeUtf8ForSm3` 等价：非摘要字符串用 UTF-8 字节 */
function utf8Bytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text))
}

export interface DesktopABogusOpts {
  userAgent: string
  query: string
  body?: string
  nowMs?: number
  random?: () => number
}

/** jumpbyte-bot internal/abogus 的逐步骤移植，仅供 desktop Passport 使用；禁止改动常量与位运算 */
export function aBogusDesktop(options: DesktopABogusOpts): string {
  const now = options.nowMs ?? Date.now()
  const random = options.random ?? cryptoRandomFloat
  const query = `${options.query}${SALT}`
  const body = `${options.body ?? ''}${SALT}`
  const queryHash = sm3ToArray(sm3ToArray(query))
  const bodyHash = sm3ToArray(sm3ToArray(body))
  const uaHash = sm3ToArray(lmStrEncode(garble(uaSbox(0), utf8Bytes(options.userAgent)), TABLES.s3))
  const fixed = utf8Bytes('784|943|1707|1019|1707|1019|1707|1067|MacIntel')
  const dateBucket = Math.trunc((now - 1721836800000) / 1209600000)
  const firstTime = now
  const secondTime = firstTime - Math.trunc(random() * 10)
  const prefix = randomPrefix(random)
  const arr = new Array<number>(55).fill(0)
  arr[0] = 41
  arr[1] = dateBucket
  arr[2] = 5
  arr[3] = (firstTime - secondTime + 3) & 255
  for (let i = 0; i < 6; i++) arr[4 + i] = byteAt(firstTime, i)
  arr[10] = 1
  arr[12] = 1
  arr[14] = 1
  arr[22] = queryHash[9]!
  arr[23] = queryHash[18]!
  arr[24] = 3
  arr[25] = queryHash[3]!
  arr[26] = bodyHash[10]!
  arr[27] = bodyHash[19]!
  arr[28] = 4
  arr[29] = bodyHash[4]!
  arr[30] = uaHash[11]!
  arr[31] = uaHash[21]!
  arr[32] = 5
  arr[33] = uaHash[5]!
  for (let i = 0; i < 6; i++) arr[34 + i] = byteAt(secondTime, i)
  arr[40] = 3
  writeInt32LE(arr, 41, 6241)
  writeInt32LE(arr, 45, 6383)
  const lastTime = utf8Bytes(`${(firstTime + 3) & 255},`)
  arr[49] = fixed.length
  arr[50] = fixed.length & 255
  arr[51] = (fixed.length >> 8) & 255
  arr[52] = lastTime.length
  arr[53] = lastTime.length & 255
  arr[54] = (lastTime.length >> 8) & 255
  const checksumIndexes = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 29, 30, 31, 33, 34, 35, 36, 37, 38,
    39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 53, 54
  ]
  let checksum = prefix.reduce((value, item) => value ^ item, 0)
  for (const index of checksumIndexes) checksum ^= arr[index]!
  const order = [
    9, 18, 30, 35, 47, 4, 44, 19, 10, 23, 12, 40, 25, 42, 3, 22, 38, 21, 5, 45, 1, 29, 6, 43, 33, 14, 36, 37, 2, 46, 15, 48, 31, 26, 16, 13,
    8, 41, 27, 17, 39, 20, 11, 0, 34, 7, 50, 51, 53, 54
  ]
  const ordered = order.map((index) => arr[index]!)
  const payload = expand3(prefix, [...ordered, ...fixed, ...lastTime, checksum], random)
  const header = abHeader(random)
  const encrypted = garble(abSbox(), payload)
  return lmStrEncode([...header, ...encrypted], TABLES.s4)
}

function expand3(prefix: number[], input: number[], random: () => number): number[] {
  const output = [...prefix]
  for (let i = 0; i < input.length; i += 3) {
    if (i + 2 >= input.length) {
      output.push(...input.slice(i))
      break
    }
    const value = Math.trunc(random() * 1000) & 255
    const first = input[i]!
    const second = input[i + 1]!
    const third = input[i + 2]!
    output.push(
      (value & 145) | (first & 110),
      (value & 66) | (second & 189),
      (value & 44) | (third & 211),
      (first & 145) | (second & 66) | (third & 44)
    )
  }
  return output
}

function abHeader(random: () => number): number[] {
  const first = Math.trunc(random() * 65535) & 255
  const second = Math.trunc(random() * 40)
  return [(first & 170) | (3 & 85), (first & 85) | (3 & 170), (second & 170) | (82 & 85), (second & 85) | (82 & 170)]
}

function randomPrefix(random: () => number): number[] {
  const first = Math.trunc(random() * 65535)
  const low = first & 255
  const high = (first >> 8) & 255
  const second = Math.trunc(random() * 240)
  const third = (Math.trunc(random() * 255) & 77) | 2 | 16 | 32 | 128
  return [
    (low & 170) | (1 & 85),
    (low & 85) | (1 & 170),
    (high & 170) | (0 & 85),
    (high & 85) | (0 & 170),
    (second & 170) | (1 & 85),
    (second & 85) | (1 & 170),
    (third & 170) | (0 & 85),
    (third & 85) | (0 & 170)
  ]
}

function abSbox(): number[] {
  return sbox([211])
}

function uaSbox(salt: number): number[] {
  return sbox([0, 1, salt])
}

function sbox(key: number[]): number[] {
  const values = Array.from({ length: 256 }, (_, index) => 255 - index)
  let previous = 0
  for (let i = 0; i < 256; i++) {
    previous = (previous * values[i]! + previous + key[i % key.length]!) % 256
    ;[values[i], values[previous]] = [values[previous]!, values[i]!]
  }
  return values
}

function garble(box: number[], input: number[]): number[] {
  let previous = 0
  return input.map((value, index) => {
    const cursor = (index + 1) % 256
    previous = (previous + box[cursor]!) % 256
    const old = box[cursor]!
    box[cursor] = box[previous]!
    box[previous] = old
    return value ^ box[(box[cursor]! + old) % 256]!
  })
}

function byteAt(value: number, index: number): number {
  return Number((BigInt(Math.trunc(value)) >> BigInt(index * 8)) & 255n)
}

function writeInt32LE(target: number[], offset: number, value: number): void {
  for (let i = 0; i < 4; i++) target[offset + i] = (value >> (i * 8)) & 255
}

function cryptoRandomFloat(): number {
  const value = randomBytes(8).readBigUInt64BE() >> 11n
  return Number(value) / 0x20000000000000
}

function lmStrEncode(bytes: number[], table: string): string {
  let out = ''
  const groupNum = bytes.length / 3
  for (let i = 0; i < groupNum; i++) {
    const b1 = bytes[3 * i]! & 255
    const b2 = bytes[3 * i + 1]! & 255
    const b3 = bytes[3 * i + 2]! & 255
    const big = (b1 << 16) | (b2 << 8) | b3
    out += table.charAt((big & 0xfc0000) >> 18)
    out += table.charAt((big & 0x3f000) >> 12)
    out += table.charAt((big & 0xfc0) >> 6)
    out += table.charAt(big & 0x3f)
  }
  const rem = bytes.length % 3
  if (rem === 1) {
    out = out.substring(0, out.length - 2) + '=='
  } else if (rem === 2) {
    out = out.substring(0, out.length - 1) + '='
  }
  return out
}
