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
