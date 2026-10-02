import { md5Hex } from '../../../utils/md5'
/* 解码层复用 a_bogus 那套「诚实拆解」的词汇表与判定枚举 —— 同一个页面里
   两份拆解结果必须长得一样，调用方才好按同一套 UI 渲染 */
import { CHECK, KIND, REASON, clockField, type Check, type Decoded, type Field } from './decode'

/**
 * X-Bogus 生成工具（抖音 / TikTok Web 的老签名）—— TypeScript 移植
 *
 * 移植自 Douyin_TikTok_Download_API `src/dtk/signing/native/xbogus.py`，常量、槽位与
 * **字节顺序**逐条对齐；那份 Python 又是 V4 `crawlers/douyin/web/xbogus.py` 的逐行移植，
 * 而 V4 是站点自己那份混淆 JS 的直译。所以这里对齐的不是「某份实现的做法」，
 * 而是站点校验时的做法。
 *
 * 整条依赖链只用 `TextEncoder` / `URL` 这类环境无关的原语（MD5 走 `utils/md5` 的纯
 * 实现），浏览器里能直接跑 —— `@ikenxuan/amagi/signing` 与文档站验证器用的就是这份。
 *
 * ## 载荷（19 字节）与槽位
 *
 * ```text
 * [64, 1/256, 1, 12, query 摘要[14..15], empty 摘要[14..15], ua 摘要[14..15],
 *  时间戳 4 字节, 536919696 4 字节, 校验位]
 * ```
 *
 * 三条摘要链各自算出 16 字节 MD5，只取第 14、15 字节（`DIGEST_INDICES`）；`1/256`
 * 是站点留在载荷里的浮点常量，最终被截断成 `0`；最后一格是前 18 格的异或。
 *
 * ## 两个曾经的坑，都会产出「看着像模像样」的错签名
 *
 * 1. **字节顺序**：站点把载荷按奇偶位拆开，再交给一个**形参表本身就乱序**的编码函数，
 *    而那个函数正好把两段拼回原序 —— 拆分是死代码。旧移植漏掉还原这一步，把
 *    「偶数位在前、奇数位在后」直接送进 RC4，字节全体错位；再叠加把 `1/256` 写成 `1`，
 *    输出与站点/V4 完全不同。见 {@link interleave}。
 * 2. **十六进制解码**：≤ 32 字符一律按站点的判据当摘要解十六进制，旧实现遇到落单的
 *    半字节会悄悄补 0（Python 那版是悄悄丢掉末位），两个不同输入能撞出同一签名。
 *    见 {@link md5StrToArray}。
 *
 * ## 时钟
 *
 * V4 把 `time.time()` 烧在函数体里，签名没法在测试里钉死。这里把秒级时间戳做成
 * 注入点（`options.timestamp`），默认值才是 `Date.now()`。
 *
 * ## 解码层
 *
 * 和 `a_bogus` 一样，X-Bogus 的载荷能整个拆开：信封头两个明文字节之后跟着 RC4 密文，
 * 密钥就是那个单字节 `PAYLOAD_KEY`，RC4 对称所以「解密」就是再加密一遍。拆开后
 * 时间戳是明文，三条摘要链各留两个字节可做候选输入校验——{@link decodeXBogus}。
 *
 * @module platforms/douyin/sign/x_bogus
 */

/** 输出字母表，与 a_bogus 的 `s2` 相同；两者可以各自演化，所以不共用一份 */
const CHARACTER = 'Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe='

/** 标准字母表的 base64（UA 摘要链用；V4 在这条链上用的是 `base64.b64encode`） */
const STANDARD_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 作用在 User-Agent 上的 RC4 密钥（三个控制字节） */
const UA_KEY: readonly number[] = [0x00, 0x01, 0x0c]

/** 作用在载荷上的 RC4 密钥 */
const PAYLOAD_KEY: readonly number[] = [0xff]

/** 站点混在时间戳旁边的固定常量 */
export const CANVAS_CONSTANT = 536919696

/** 空串的 MD5，算法会把它再哈希一轮，结果是个常量 */
const EMPTY_MD5 = 'd41d8cd98f00b204e9800998ecf8427e'

/** 载荷开头四个槽位的字面量；`1/256` 那一格会被截断成 `0`，但不能顺手改写成 `0` */
const PAYLOAD_LEAD: readonly number[] = [64, 1 / 256, 1, 12]

/** 每条摘要链贡献的两个字节在 16 字节摘要里的下标 */
const DIGEST_INDICES = [14, 15] as const

/** 信封开头的两个明文字节（`2` 与 `255`），密文接在它们后面 */
const ENVELOPE_LEAD = [2, 255] as const

/** 一份 X-Bogus 的定长：7 组 × 4 字符 = 21 字节 = 信封 2 + 载荷 19 */
const X_BOGUS_LENGTH = 28

/** 不传 UA 时使用的默认值，与 V4 一字不差（改它等于改签名） */
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0'

/** 小写十六进制字符，V4 与 xbogus.py 都只认这一档 */
const HEX_DIGITS = '0123456789abcdef'

/* ------------------------------------------------------------------ */
/* 基础原语（全部环境无关）                                              */
/* ------------------------------------------------------------------ */

/** 字符串按 latin1 取字节：每个码元截到 8 位，与 `Buffer.from(s, 'latin1')` 一致 */
const latin1Bytes = (value: string): Uint8Array => {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index++) bytes[index] = value.charCodeAt(index) & 0xff
  return bytes
}

/** 字节按 latin1 还原成字符串（信封与密文的搬运格式） */
const bytesToLatin1 = (bytes: ArrayLike<number>): string => {
  let out = ''
  for (let index = 0; index < bytes.length; index++) out += String.fromCharCode(bytes[index] & 0xff)
  return out
}

/** 标准字母表的 base64（带 `=` 填充），与 `Buffer#toString('base64')` 输出一致 */
const encodeStandardBase64 = (bytes: ArrayLike<number>): string => {
  let out = ''
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const chunk: number[] = []
    for (let i = 0; i < 3; i++) chunk.push(offset + i < bytes.length ? bytes[offset + i] : 0)
    const block = (chunk[0] << 16) | (chunk[1] << 8) | chunk[2]
    for (const digit of [(block >>> 18) & 0x3f, (block >>> 12) & 0x3f, (block >>> 6) & 0x3f, block & 0x3f]) {
      out += STANDARD_BASE64[digit]
    }
  }
  const pad = (3 - (bytes.length % 3)) % 3
  return out.slice(0, out.length - pad) + '='.repeat(pad)
}

/** RC4。对称流密码，解密与加密是同一个函数 */
const rc4 = (key: readonly number[], data: Uint8Array): Uint8Array => {
  const box: number[] = Array.from({ length: 256 }, (_, index) => index)
  let j = 0
  for (let index = 0; index < 256; index++) {
    j = (j + box[index] + key[index % key.length]) % 256
    ;[box[index], box[j]] = [box[j], box[index]]
  }

  const out = new Uint8Array(data.length)
  let i = 0
  j = 0
  for (let index = 0; index < data.length; index++) {
    i = (i + 1) % 256
    j = (j + box[i]) % 256
    ;[box[i], box[j]] = [box[j], box[i]]
    out[index] = data[index] ^ box[(box[i] + box[j]) % 256]
  }
  return out
}

/**
 * 十六进制串 → 字节数组；超过 32 字符则按原始文本取码元（只取每码元的低位字节，
 * 与站点 `ord(c) & 0xff` 的语义一致）。
 *
 * **长度判据（≤ 32 走十六进制）是站点的**，不是这里加的：站点把任何不超过一份
 * 摘要长度的字符串都当作摘要来解。真实请求的 path + query 永远长过 32 字符，
 * 走的是文本分支，所以这条规则碰不到线上行为。
 *
 * **旧实现在这里会悄悄吞掉落单的半字节**，两个不同输入因此撞出同一份签名：
 * 参考实现（Python）用 `range(0, len - 1, 2)`，末位字符直接不参与运算，
 * `"abcdef"` 与 `"abcdefg"` 同签名；本仓库旧 TS 版把缺失的低半字节当成 0，
 * `"abc"` 与 `"abc0"` 同签名。两者的共同点是「输入不合法，却拿到一份像模像样的
 * 签名」—— 这比报错难查得多，所以这里选择**报错**：长度必须是偶数、字符必须是小写
 * 十六进制，否则抛出，绝不替调用方补位或丢位。
 */
const md5StrToArray = (value: string): number[] => {
  if (value.length > 32) {
    const codePoints: number[] = []
    for (const char of value) codePoints.push(char.charCodeAt(0))
    return codePoints
  }

  const nibbles = new Map<string, number>(HEX_DIGITS.split('').map((char, index) => [char, index]))
  const bytes: number[] = []
  for (let index = 0; index < value.length; index += 2) {
    const pair = value.slice(index, index + 2)
    const high = nibbles.get(value[index])
    const low = index + 1 < value.length ? nibbles.get(value[index + 1]) : undefined
    if (high === undefined || low === undefined) {
      throw new Error(`X-Bogus 签名：${JSON.stringify(value)} 不是偶数长度的小写十六进制串（${JSON.stringify(pair)} 处）`)
    }
    bytes.push((high << 4) | low)
  }
  return bytes
}

/** 字节摘要的十六进制 */
const md5OfBytes = (bytes: ArrayLike<number>): string => md5Hex(Uint8Array.from(bytes, (byte) => byte & 0xff))

/** query 摘要链：两轮 MD5 */
const queryDigestOf = (urlPath: string): number[] => md5StrToArray(md5OfBytes(md5StrToArray(md5OfBytes(md5StrToArray(urlPath)))))

/** empty 摘要链：哈希空串，是个常量。第 14、15 字节出现在每一份 X-Bogus 里 */
const emptyDigestOf = (): number[] => md5StrToArray(md5OfBytes(md5StrToArray(EMPTY_MD5)))

/** UA 摘要链：RC4 → 标准 base64 → MD5。base64 是纯 ASCII，直接按文本进 MD5（等价 latin1 字节） */
const uaDigestOf = (userAgent: string): number[] => md5StrToArray(md5Hex(encodeStandardBase64(rc4(UA_KEY, latin1Bytes(userAgent)))))

/**
 * 偶数位在前、奇数位在后 —— 站点对载荷做的拆分。
 *
 * 拆分本身是死代码（{@link interleave} 会把它原样拼回去），真正的作用只有
 * 一处：让 `1/256` 那一格被截断成整数。形状照抄站点，为的是别人对着 xbogus.py 读时
 * 能一句一句对上，也让「漏掉还原」这个坑不至于再犯一次。
 */
const splitEvenOdd = (values: readonly number[]): number[] => {
  const head: number[] = []
  const tail: number[] = []
  for (let index = 0; index < values.length; index++) {
    if (index % 2 === 0) head.push(values[index])
    else tail.push(values[index])
  }
  return [...head, ...tail]
}

/** 把 {@link splitEvenOdd} 拆开的两段按下标交错回原序（顺便截断成整数）。 */
const interleave = (values: readonly number[]): number[] => {
  const head = values.slice(0, 10)
  const tail = values.slice(10)
  const merged: number[] = []
  for (let index = 0; index < head.length; index++) {
    merged.push(Math.trunc(head[index]))
    if (index < tail.length) merged.push(Math.trunc(tail[index]))
  }
  return merged
}

/** 三个载荷字节 → 四个输出字符 */
const encodeGroup = (first: number, second: number, third: number): string => {
  const merged = ((first & 0xff) << 16) | ((second & 0xff) << 8) | (third & 0xff)
  return (
    CHARACTER[(merged & 0xfc0000) >> 18] + CHARACTER[(merged & 0x3f000) >> 12] + CHARACTER[(merged & 0xfc0) >> 6] + CHARACTER[merged & 0x3f]
  )
}

/* ------------------------------------------------------------------ */
/* 签名                                                                 */
/* ------------------------------------------------------------------ */

/** X-Bogus 签名算法的返回结果 */
export interface XBogusResult {
  /** 已拼上 `X-Bogus=` 的完整 URL */
  fullUrl: string
  /** 签名值本身，28 个字符 */
  xbogus: string
  /** 实际参与签名的 User-Agent */
  userAgent: string
}

/** {@link XBogus.getXBogus} 的注入点 */
export interface XBogusOptions {
  /**
   * 秒级 Unix 时间戳，默认 `Math.floor(Date.now() / 1000)`。
   *
   * 签名里封着它（4 个字节），所以同一秒内两次调用结果相同，钉死它才能复现一份签名
   * —— 这既是对拍浏览器输出的前提，也是快照测试能成立的原因。
   */
  timestamp?: number
}

export default class XBogus {
  /** V4 兼容字段：V4 会把结果同步写进 `params` / `xb`，本实现不写 */
  public params?: string
  public xb?: string

  /**
   * 生成 X-Bogus 签名。
   *
   * @param url - 完整的 URL 地址（签的是它的 pathname + search）
   * @param ua - 可选的 User-Agent，不提供则使用默认值
   * @param options - `timestamp` 注入点（秒级），省略时取当前时间
   * @returns 完整 URL（已带 `X-Bogus=`）、签名值与实际使用的 User-Agent
   */
  public getXBogus(url: string, ua?: string, options: XBogusOptions = {}): XBogusResult {
    const parsedUrl = new URL(url)
    const urlPath = parsedUrl.pathname + parsedUrl.search
    const userAgent = ua ?? DEFAULT_USER_AGENT
    const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000)

    const xbogus = signXBogus(urlPath, userAgent, timestamp)
    const fullUrl = url.includes('?') ? `${url}&X-Bogus=${xbogus}` : `${url}?X-Bogus=${xbogus}`

    return { fullUrl, xbogus, userAgent }
  }
}

/**
 * 对一条 path+search 签出 X-Bogus。
 *
 * {@link XBogus.getXBogus} 的函数式形态 —— 验证工具要用它对候选输入重签；
 * 输入是已经拆好的 `pathname + search`，不重复解析 URL。
 * @param urlPath - 参与 签名的 `pathname + search`
 * @param userAgent - 参与签名的 User-Agent
 * @param timestamp - 秒级时间戳
 * @returns 28 个字符的签名值
 */
export const signXBogus = (urlPath: string, userAgent: string, timestamp: number): string => {
  const queryDigest = queryDigestOf(urlPath)
  const emptyDigest = emptyDigestOf()
  const uaDigest = uaDigestOf(userAgent)

  const payload: number[] = [
    ...PAYLOAD_LEAD,
    queryDigest[DIGEST_INDICES[0]],
    queryDigest[DIGEST_INDICES[1]],
    emptyDigest[DIGEST_INDICES[0]],
    emptyDigest[DIGEST_INDICES[1]],
    uaDigest[DIGEST_INDICES[0]],
    uaDigest[DIGEST_INDICES[1]],
    (timestamp >> 24) & 0xff,
    (timestamp >> 16) & 0xff,
    (timestamp >> 8) & 0xff,
    timestamp & 0xff,
    (CANVAS_CONSTANT >> 24) & 0xff,
    (CANVAS_CONSTANT >> 16) & 0xff,
    (CANVAS_CONSTANT >> 8) & 0xff,
    CANVAS_CONSTANT & 0xff
  ]

  /* 校验位：前 18 格逐格异或；`1/256` 那一格照站点做法先截断成 0 再参与 */
  let checksum = Math.trunc(payload[0])
  for (let index = 1; index < payload.length; index++) checksum ^= Math.trunc(payload[index])
  payload.push(checksum)

  const encrypted = rc4(PAYLOAD_KEY, Uint8Array.from(interleave(splitEvenOdd(payload))))
  const garbled = `${String.fromCharCode(ENVELOPE_LEAD[0], ENVELOPE_LEAD[1])}${bytesToLatin1(encrypted)}`

  /* 每三个字节编成四个字符；恰好 21 字节，除不尽的部分（本来也没有）不编 */
  let xbogus = ''
  for (let index = 0; index + 2 < garbled.length; index += 3) {
    xbogus += encodeGroup(garbled.charCodeAt(index), garbled.charCodeAt(index + 1), garbled.charCodeAt(index + 2))
  }
  return xbogus
}

/* ------------------------------------------------------------------ */
/* 解码层                                                               */
/* ------------------------------------------------------------------ */

/** 结构检查能发现的问题。真实签名永远一个都不该有 */
export type XBogusProblem = 'alphabet' | 'length not 28' | 'envelope lead' | 'lead slots' | 'empty digest' | 'canvas constant' | 'checksum'

/**
 * 只凭签名本身能做的全部检查 —— 不需要任何候选输入。
 *
 * X-Bogus 里封着三个**常量**（载荷前四格、empty 摘要链字节、canvas 常量），
 * 它们与校验位一起构成指纹：一份能通过全部检查的值，必然出自这套算法的装配顺序。
 * @param value - 待检查的值（28 个字符）
 * @returns 第一个发现的问题；`null` 表示全部通过
 */
export const xBogusStructureError = (value: string): XBogusProblem | null => {
  if (value.length !== X_BOGUS_LENGTH) return 'length not 28'

  const table = new Map<string, number>(CHARACTER.split('').map((char, index) => [char, index]))
  const bytes: number[] = []
  for (let offset = 0; offset < value.length; offset += 4) {
    let block = 0
    for (const char of value.slice(offset, offset + 4)) {
      const digit = table.get(char)
      if (digit === undefined) return 'alphabet'
      block = (block << 6) | digit
    }
    bytes.push((block >>> 16) & 0xff, (block >>> 8) & 0xff, block & 0xff)
  }

  if (bytes[0] !== ENVELOPE_LEAD[0] || bytes[1] !== ENVELOPE_LEAD[1]) return 'envelope lead'

  const payload = Array.from(rc4(PAYLOAD_KEY, Uint8Array.from(bytes.slice(2))))
  const canvasBytes = [
    (CANVAS_CONSTANT >>> 24) & 0xff,
    (CANVAS_CONSTANT >>> 16) & 0xff,
    (CANVAS_CONSTANT >>> 8) & 0xff,
    CANVAS_CONSTANT & 0xff
  ]
  const emptyBytes = emptyDigestOf()
  const slotValues = payload.slice(0, 4).join(',')
  if (slotValues !== [64, 0, 1, 12].join(',')) return 'lead slots'
  if (payload[6] !== emptyBytes[DIGEST_INDICES[0]] || payload[7] !== emptyBytes[DIGEST_INDICES[1]]) return 'empty digest'
  if (payload.slice(14, 18).join(',') !== canvasBytes.join(',')) return 'canvas constant'

  let checksum = payload[0]
  for (let index = 1; index < 18; index++) checksum ^= payload[index]
  return checksum === payload[18] ? null : 'checksum'
}

/** {@link decodeXBogus} 的候选输入。给了哪个就校验哪条链 */
export interface XBogusCandidates {
  /** 签名所覆盖的 `pathname + search`（不含 `X-Bogus` 自身） */
  query?: string
  userAgent?: string
}

/**
 * 拆开一份 X-Bogus，并就调用方给出的候选值做校验。
 *
 * 能原样读回的只有一个值：秒级时间戳。三条摘要链各留两个字节（16 位），输入无法
 * 从中倒推，做的是校验 —— 给候选值，回答是不是它封的那一个。证据量比 a_bogus
 * 的 24 位小，但足以区分「对着的 URL」与「差一个参数的 URL」。
 * @param value - X-Bogus 的值（28 个字符）
 * @param candidates - 候选的 path+search 与 User-Agent，给哪个校验哪个
 * @returns 拆解结果；格式不合法时 `recovered` 为 `false` 并给出 `reason`
 */
export const decodeXBogus = (value: string, candidates: XBogusCandidates = {}): Decoded => {
  const problem = xBogusStructureError(value)
  if (problem !== null) {
    return {
      parameter: 'X-Bogus',
      platform: 'douyin',
      algorithm: 'X-Bogus',
      recovered: false,
      reason: `${REASON.MALFORMED}:${problem}`,
      fields: [],
      checks: [],
      notes: []
    }
  }

  const table = new Map<string, number>(CHARACTER.split('').map((char, index) => [char, index]))
  const bytes: number[] = []
  for (let offset = 0; offset < value.length; offset += 4) {
    let block = 0
    for (const char of value.slice(offset, offset + 4)) block = (block << 6) | (table.get(char) as number)
    bytes.push((block >>> 16) & 0xff, (block >>> 8) & 0xff, block & 0xff)
  }
  const payload = Array.from(rc4(PAYLOAD_KEY, Uint8Array.from(bytes.slice(2))))

  const timestamp = ((payload[10] << 24) | (payload[11] << 16) | (payload[12] << 8) | payload[13]) >>> 0

  const carried = {
    query: [payload[4], payload[5]],
    empty: [payload[6], payload[7]],
    user_agent: [payload[8], payload[9]]
  } as const

  const fields: Field[] = [
    { name: 'header_lead', value: '[2, 255]', kind: KIND.PLAIN },
    { name: 'lead_slots', value: '[64, 0, 1, 12]', kind: KIND.PLAIN, detail: '第三格在载荷里写的是 1/256，编码前被截断成 0' },
    clockField('timestamp', timestamp * 1000, '秒级时钟，与 a_bogus 的毫秒时钟不同源'),
    { name: 'canvas_constant', value: String(CANVAS_CONSTANT), kind: KIND.PLAIN },
    ...(['query', 'empty', 'user_agent'] as const).map((name) => ({
      name: `${name}_digest`,
      value: carried[name].join(' '),
      kind: KIND.DIGEST,
      detail: `${name} 链的 2 个字节（MD5 摘要的第 14、15 格）`
    })),
    { name: 'checksum', value: String(payload[18]), kind: KIND.CHECKSUM, detail: '前 18 格逐格异或' }
  ]

  const candidateOf: Record<string, string | undefined> = { query: candidates.query, empty: '', user_agent: candidates.userAgent }
  const predict = (name: 'query' | 'user_agent'): number[] => {
    const digest = name === 'query' ? queryDigestOf(candidates.query as string) : uaDigestOf(candidates.userAgent as string)
    return [digest[DIGEST_INDICES[0]], digest[DIGEST_INDICES[1]]]
  }

  const checks: Check[] = (['query', 'empty', 'user_agent'] as const).map((name) => {
    const observed = carried[name]
    if (name === 'empty') {
      const expected = emptyDigestOf()
      return {
        name,
        status: expected[DIGEST_INDICES[0]] === observed[0] && expected[DIGEST_INDICES[1]] === observed[1] ? CHECK.MATCH : CHECK.DIFFERS,
        bits: 16
      }
    }
    const candidate = candidateOf[name]
    if (candidate === undefined) return { name, status: CHECK.NOT_SUPPLIED, bits: 16 }
    const predicted = predict(name as 'query' | 'user_agent')
    return predicted.join(',') === observed.join(',')
      ? { name, status: CHECK.MATCH, bits: 16, covered: candidate }
      : { name, status: CHECK.DIFFERS, bits: 16 }
  })

  return {
    parameter: 'X-Bogus',
    platform: 'douyin',
    algorithm: 'X-Bogus',
    recovered: true,
    fields,
    checks,
    notes: ['checksum_verified', 'structure_constants_verified']
  }
}
