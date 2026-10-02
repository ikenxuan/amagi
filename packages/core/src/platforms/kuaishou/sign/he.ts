import { deriveKuaishouHudrBody, KuaishouHudrContext, KuaishouHudrResult } from './hudr'
import {
  bytesToLowerHex,
  computeKuaishouLrcHex,
  deriveKuaishouB2sa,
  deriveKuaishouCts,
  hexToSignedBytes,
  toLittleEndianHex,
  transformKuaishouHeHex,
  xorByteArrays
} from './primitives'

/**
 * 生成快手 `$HE_` 段所需的上下文参数。
 */
export type KuaishouHeContext = {
  count: number
  hudrBody: string
  randomValue: number
  signInput: string
  startupRandom: number
  timestamp: number
}

/**
 * 快手完整纯算法签名所需的上下文参数。
 */
export type KuaishouPureSignContext = KuaishouHudrContext & {
  randomValue: number
  signInput: string
  startupRandom: number
  timestamp: number
}

/**
 * 快手 `$HE_` 段的中间结果。
 */
export type KuaishouHeResult = {
  finalHex: string
  hashFieldHex: string
  preHex: string
}

/**
 * 快手纯算法签名的完整结果。
 */
export type KuaishouPureSignResult = KuaishouHudrResult & {
  he: KuaishouHeResult
  signResult: string
}

const KUAISHOU_HE_HEADER_HEX = '4B54'
const KUAISHOU_HE_VERSION_HEX = 'cda9'
const KUAISHOU_HE_STARTUP_MARKER_HEX = 'ab'
const KUAISHOU_HE_FIXED_BODY_HEX = '0100000001'
const KUAISHOU_HE_INPUT_XOR_MASK = [45, 211, 69, 192] as const
const KUAISHOU_HE_COUNTER_XOR_MASK = 3131873467
const KUAISHOU_HE_TIME_XOR_MASK = 3360347992n
const KUAISHOU_HE_TAIL_HEX = '9b563eda7b563e'
const KUAISHOU_HE_RANDOM_MAX = 281474976710655

/**
 * 计算 `$HE_` 中的 hash field。
 *
 * 它由 `signInput + HUDRBody` 经 `b2sa -> cts -> 截断 -> 异或掩码`
 * 这条链路导出，是 `$HE_` 中与接口输入最直接相关的一段。
 *
 * @param signInput - 快手 `__NS_hxfalcon` 的 sign input
 * @param hudrBody - `HUDR_` 去前缀后的主体
 * @returns `$HE_` 载荷中的 4 字节 hash field hex
 */
export const deriveKuaishouHeHashFieldHex = (signInput: string, hudrBody: string): string => {
  const hashInput = `${signInput}HUDR_${hudrBody}`
  const digestHex = bytesToLowerHex(deriveKuaishouCts(deriveKuaishouB2sa(hashInput))).slice(0, 8)
  return bytesToLowerHex(xorByteArrays(hexToSignedBytes(digestHex), KUAISHOU_HE_INPUT_XOR_MASK))
}

/**
 * 推导快手签名中的 `$HE_` 段。
 *
 * @param context - 生成 `$HE_` 所需的上下文参数
 * @returns `$HE_` 的最终 hex、中间 hash field 和 preHex
 */
export const deriveKuaishouHeHex = (context: KuaishouHeContext): KuaishouHeResult => {
  const random48 = Math.floor(context.randomValue * KUAISHOU_HE_RANDOM_MAX)
  const hashFieldHex = deriveKuaishouHeHashFieldHex(context.signInput, context.hudrBody)
  const timeXor = BigInt(context.timestamp) ^ KUAISHOU_HE_TIME_XOR_MASK
  const preHex = [
    KUAISHOU_HE_HEADER_HEX,
    KUAISHOU_HE_VERSION_HEX,
    KUAISHOU_HE_STARTUP_MARKER_HEX,
    toLittleEndianHex(context.startupRandom, 6),
    toLittleEndianHex(random48, 6),
    KUAISHOU_HE_FIXED_BODY_HEX,
    toLittleEndianHex(context.count ^ KUAISHOU_HE_COUNTER_XOR_MASK, 4),
    hashFieldHex,
    toLittleEndianHex(timeXor, 6),
    KUAISHOU_HE_TAIL_HEX,
    computeKuaishouLrcHex(KUAISHOU_HE_TAIL_HEX)
  ].join('')
  const finalHex = transformKuaishouHeHex(preHex, computeKuaishouLrcHex(preHex))

  return {
    finalHex,
    hashFieldHex,
    preHex
  }
}

/**
 * 一次性推导快手完整纯算法签名。
 *
 * 该方法会先生成 `HUDR_`，再拼出 `$HE_`，最终返回完整
 * `HUDR_...$HE_...` 形式的 `__NS_hxfalcon`。
 *
 * @param context - 快手纯算法签名上下文
 * @returns 完整签名结果及关键中间态
 */
export const deriveKuaishouPureSignature = (context: KuaishouPureSignContext): KuaishouPureSignResult => {
  const hudr = deriveKuaishouHudrBody(context)
  const he = deriveKuaishouHeHex({
    count: context.count,
    hudrBody: hudr.body,
    randomValue: context.randomValue,
    signInput: context.signInput,
    startupRandom: context.startupRandom,
    timestamp: context.timestamp
  })

  return {
    ...hudr,
    he,
    signResult: `${hudr.full}$HE_${he.finalHex}`
  }
}

/* ------------------------------------------------------------------ */
/* 解码层：`$HE_` 的布局是固定的，整机字段可原样读回                      */
/* ------------------------------------------------------------------ */

/** 结构检查能发现的问题。真实签名永远一个都不该有 */
export type KuaishouHeProblem =
  | 'not hex'
  | 'length not 90'
  | 'envelope checksum'
  | 'tail lrc'
  | 'header magic'
  | 'version'
  | 'startup marker'
  | 'fixed body'
  | 'tail'

/** {@link decodeKuaishouHe} 的拆解结果 */
export interface DecodedKuaishouHe {
  /** 页面加载时的一次性随机数（LE 6 字节，原样读回） */
  startupRandom: number
  /** 本条签名自己的 48 位随机数（LE 6 字节，原样读回） */
  random: number
  /** 签名计数器（异或掩码已解掉） */
  count: number
  /** 毫秒时间戳（异或掩码已解掉）—— 与 a_bogus 的毫秒时钟同源，都是 Date.now() 一路 */
  timestampMs: number
  /** 4 字节 hash field（十六进制）。重算它需要 signInput 与 HUDR body，见 {@link deriveKuaishouHeHashFieldHex} */
  hashFieldHex: string
  /** 发现的全部问题；空数组 = 结构良好 */
  problems: KuaishouHeProblem[]
}

/** `$HE_` 最终输出的定长：布局 44 字节 + 末尾 1 字节异或键 */
const HE_HEX_LENGTH = 90

/**
 * 拆开一段 `$HE_`。
 *
 * 最终输出的最后一个字节是**异或键**：它本身是前 44 字节的 LRC 校验，同时把那
 * 44 字节逐个异或成密文 —— 所以解码顺序固定为「拆键 → 还原 → 逐段校验 → 读字段」。
 * 能同时通过两层校验（信封 LRC + 尾段 LRC）与四个布局常量的值，必然是这套装配
 * 顺序产出的；`count` 与时间戳随后原样读回，不需要任何候选输入。
 *
 * 它**不**校验 hash field —— 那四字节绑的是 signInput + HUDR body，候选值给齐了
 * 可用 {@link deriveKuaishouHeHashFieldHex} 自行比对。
 * @param hex - `$HE_` 后面的那段 hex（90 个字符）
 * @returns 拆解结果；布局不符时 `problems` 非空，字段值不可信
 */
export const decodeKuaishouHe = (hex: string): DecodedKuaishouHe => {
  const problems: KuaishouHeProblem[] = []
  const fail = (problem: KuaishouHeProblem): void => {
    problems.push(problem)
  }

  if (!/^[0-9a-fA-F]+$/.test(hex)) fail('not hex')
  if (hex.length !== HE_HEX_LENGTH) fail('length not 90')
  if (problems.length > 0) {
    return { startupRandom: 0, random: 0, count: 0, timestampMs: 0, hashFieldHex: '', problems }
  }

  const bytes = hexToSignedBytes(hex.toLowerCase())
  const key = bytes[bytes.length - 1]
  const pre = bytes.slice(0, -1).map((byte) => (byte ^ key) & 255)

  /* 信封校验：异或键 = 前 44 字节各取 unsigned 后的 LRC */
  const envelopeLrc = -pre.reduce((total, value) => total + value, 0) & 255 & 255
  if (envelopeLrc !== (key & 255)) fail('envelope checksum')

  /* 尾段校验：倒数第二个字节 = tail 7 字节的 LRC */
  const tail = pre.slice(36, 43)
  const tailLrc = -tail.reduce((total, value) => total + value, 0) & 255 & 255
  if (tailLrc !== pre[43]) fail('tail lrc')

  const expectBytes = (offset: number, expectedHex: string, problem: KuaishouHeProblem): void => {
    const expected = hexToSignedBytes(expectedHex).map((byte) => byte & 255)
    if (!expected.every((byte, index) => pre[offset + index] === byte)) fail(problem)
  }
  expectBytes(0, KUAISHOU_HE_HEADER_HEX, 'header magic')
  expectBytes(2, KUAISHOU_HE_VERSION_HEX, 'version')
  expectBytes(4, KUAISHOU_HE_STARTUP_MARKER_HEX, 'startup marker')
  expectBytes(17, KUAISHOU_HE_FIXED_BODY_HEX, 'fixed body')
  expectBytes(36, KUAISHOU_HE_TAIL_HEX, 'tail')

  const readLE = (offset: number, size: number): number => {
    let value = 0
    for (let index = 0; index < size; index++) value += pre[offset + index] * 2 ** (8 * index)
    return value
  }
  const unmaskCounter = (readLE(22, 4) ^ KUAISHOU_HE_COUNTER_XOR_MASK) >>> 0
  const unmaskTime = BigInt(Math.trunc(readLE(30, 6))) ^ KUAISHOU_HE_TIME_XOR_MASK

  return {
    startupRandom: Math.trunc(readLE(5, 6)),
    random: Math.trunc(readLE(11, 6)),
    count: unmaskCounter,
    timestampMs: Number(unmaskTime),
    hashFieldHex: bytesToLowerHex(pre.slice(26, 30)),
    problems
  }
}
