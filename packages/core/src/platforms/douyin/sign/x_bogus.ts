import crypto from 'node:crypto'
import URL from 'node:url'

/**
 * X-Bogus 生成工具（抖音 / TikTok Web 的老签名）—— TypeScript 移植
 *
 * 移植自 Douyin_TikTok_Download_API `src/dtk/signing/native/xbogus.py`，常量、槽位与
 * **字节顺序**逐条对齐；那份 Python 又是 V4 `crawlers/douyin/web/xbogus.py` 的逐行移植，
 * 而 V4 是站点自己那份混淆 JS 的直译。所以这里对齐的不是「某份实现的做法」，
 * 而是站点校验时的做法。
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
 *    输出与站点/V4 完全不同。见 {@link XBogus.interleave}。
 * 2. **十六进制解码**：≤ 32 字符一律按站点的判据当摘要解十六进制，旧实现遇到落单的
 *    半字节会悄悄补 0（Python 那版是悄悄丢掉末位），两个不同输入能撞出同一签名。
 *    见 {@link XBogus.md5StrToArray}。
 *
 * ## 时钟
 *
 * V4 把 `time.time()` 烧在函数体里，签名没法在测试里钉死。这里把秒级时间戳做成
 * 注入点（`options.timestamp`），默认值才是 `Date.now()`。
 *
 * @module platforms/douyin/sign/x_bogus
 */

/** 输出字母表，与 a_bogus 的 `s2` 相同；两者可以各自演化，所以不共用一份 */
const CHARACTER = 'Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe='

/** 作用在 User-Agent 上的 RC4 密钥（三个控制字节） */
const UA_KEY = Buffer.from([0x00, 0x01, 0x0c])

/** 作用在载荷上的 RC4 密钥 */
const PAYLOAD_KEY = Buffer.from([0xff])

/** 站点混在时间戳旁边的固定常量 */
const CANVAS_CONSTANT = 536919696

/** 空串的 MD5，算法会把它再哈希一轮，结果是个常量 */
const EMPTY_MD5 = 'd41d8cd98f00b204e9800998ecf8427e'

/** 载荷开头四个槽位的字面量；`1/256` 那一格会被截断成 `0`，但不能顺手改写成 `0` */
const PAYLOAD_LEAD: readonly number[] = [64, 1 / 256, 1, 12]

/** 每条摘要链贡献的两个字节在 16 字节摘要里的下标 */
const DIGEST_INDICES = [14, 15] as const

/** 信封开头的两个明文字节（`2` 与 `255`），密文接在它们后面 */
const ENVELOPE_LEAD = [2, 255] as const

/** 不传 UA 时使用的默认值，与 V4 一字不差（改它等于改签名） */
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0'

/** 小写十六进制字符，V4 与 xbogus.py 都只认这一档 */
const HEX_DIGITS = '0123456789abcdef'

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
  /** 十六进制字符 → 半字节；未映射的字符取出 `null` 或 `undefined`，两者都算非法 */
  private readonly hexNibbles: (number | null)[]
  /** 内置默认 UA */
  private readonly defaultUa: string
  /** V4 兼容字段：V4 会把结果同步写进 `params` / `xb`，本实现不写 */
  public params?: string
  public xb?: string

  constructor() {
    this.hexNibbles = new Array(128).fill(null)
    for (let index = 0; index < HEX_DIGITS.length; index++) {
      this.hexNibbles[HEX_DIGITS.charCodeAt(index)] = index
    }
    this.defaultUa = DEFAULT_USER_AGENT
  }

  /**
   * 十六进制串 → 字节数组；超过 32 字符则按原始文本取码点。
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
   *
   * @param value - 十六进制串 / 原始文本，或现成的字节数组（复制一份返回）
   * @returns 字节数组
   */
  private md5StrToArray(value: string | number[]): number[] {
    if (Array.isArray(value)) return [...value]

    if (value.length > 32) {
      const codePoints: number[] = []
      for (const char of value) codePoints.push(char.charCodeAt(0))
      return codePoints
    }

    const bytes: number[] = []
    for (let index = 0; index < value.length; index += 2) {
      const pair = value.slice(index, index + 2)
      const high = this.hexNibbles[value.charCodeAt(index)]
      const low = index + 1 < value.length ? this.hexNibbles[value.charCodeAt(index + 1)] : null
      if (high === null || high === undefined || low === null || low === undefined) {
        throw new Error(`X-Bogus 签名：${JSON.stringify(value)} 不是偶数长度的小写十六进制串（${JSON.stringify(pair)} 处）`)
      }
      bytes.push((high << 4) | low)
    }
    return bytes
  }

  /** MD5 十六进制摘要；字符串先过 {@link XBogus.md5StrToArray}，数组按原样取字节 */
  private md5(data: string | number[]): string {
    const bytes = typeof data === 'string' ? this.md5StrToArray(data) : data
    return crypto.createHash('md5').update(Buffer.from(bytes)).digest('hex')
  }

  /** query 摘要链：两轮 MD5 */
  private md5Encrypt(urlPath: string): number[] {
    return this.md5StrToArray(this.md5(this.md5StrToArray(this.md5(urlPath))))
  }

  /**
   * empty 摘要链：哈希空串，是个常量。
   *
   * 它的第 14、15 字节出现在每一份 X-Bogus 里 —— 解码时对不上这两个字节的，
   * 就不是 X-Bogus。
   */
  private emptyDigest(): number[] {
    return this.md5StrToArray(this.md5(this.md5StrToArray(EMPTY_MD5)))
  }

  /** UA 摘要链：RC4 → base64 → MD5，再解回字节 */
  private userAgentDigest(userAgent: string): number[] {
    const encrypted = this.rc4Encrypt(UA_KEY, Buffer.from(userAgent, 'latin1'))
    return this.md5StrToArray(this.md5(encrypted.toString('base64')))
  }

  /** RC4（与 Python 版逐句对应） */
  private rc4Encrypt(key: Buffer, data: Buffer): Buffer {
    const box: number[] = Array.from({ length: 256 }, (_, index) => index)
    let j = 0
    for (let index = 0; index < 256; index++) {
      j = (j + box[index] + key[index % key.length]) % 256
      ;[box[index], box[j]] = [box[j], box[index]]
    }

    const out = Buffer.alloc(data.length)
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
   * 偶数位在前、奇数位在后 —— 站点对载荷做的拆分。
   *
   * 拆分本身是死代码（{@link XBogus.interleave} 会把它原样拼回去），真正的作用只有
   * 一处：让 `1/256` 那一格被截断成整数。形状照抄站点，为的是别人对着 xbogus.py 读时
   * 能一句一句对上，也让「漏掉还原」这个坑不至于再犯一次。
   */
  private splitEvenOdd(values: number[]): number[] {
    const head: number[] = []
    const tail: number[] = []
    for (let index = 0; index < values.length; index++) {
      if (index % 2 === 0) head.push(values[index])
      else tail.push(values[index])
    }
    return [...head, ...tail]
  }

  /**
   * 把 {@link XBogus.splitEvenOdd} 拆开的两段按下标交错回原序（顺便截断成整数）。
   *
   * **这一步不能省**：站点那个编码函数的形参表本身是乱序的 ——
   * V4 写作 `encoding_conversion(a, b, c, e, d, t, f, r, n, o, i, _, x, u, s, l, v, h, p)`，
   * 函数体按 `[a, i, b, _, c, x, e, u, d, s, t, l, f, v, r, h, n, p, o]` 拼接，
   * 传进去的又是拆开的两段，算下来正好还原成原始顺序。旧移植把它当成顺序形参处理，
   * 于是送进 RC4 的字节全体错位，签名从根上就是错的，还错得看不出来。
   */
  private interleave(values: number[]): number[] {
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
  private encodeGroup(first: number, second: number, third: number): string {
    const merged = ((first & 0xff) << 16) | ((second & 0xff) << 8) | (third & 0xff)
    return (
      CHARACTER[(merged & 0xfc0000) >> 18] +
      CHARACTER[(merged & 0x3f000) >> 12] +
      CHARACTER[(merged & 0xfc0) >> 6] +
      CHARACTER[merged & 0x3f]
    )
  }

  /**
   * 生成 X-Bogus 签名。
   *
   * @param url - 完整的 URL 地址（签的是它的 pathname + search）
   * @param ua - 可选的 User-Agent，不提供则使用默认值
   * @param options - `timestamp` 注入点（秒级），省略时取当前时间
   * @returns 完整 URL（已带 `X-Bogus=`）、签名值与实际使用的 User-Agent
   */
  public getXBogus(url: string, ua?: string, options: XBogusOptions = {}): XBogusResult {
    const parsedUrl = new URL.URL(url)
    const urlPath = parsedUrl.pathname + parsedUrl.search
    const userAgent = ua ?? this.defaultUa

    const userAgentDigest = this.userAgentDigest(userAgent)
    const emptyDigest = this.emptyDigest()
    const queryDigest = this.md5Encrypt(urlPath)

    const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000)

    // 19 格载荷：槽位与 xbogus.py 的 PAYLOAD_LEAD / *_SLOTS 一一对应
    const payload: number[] = [
      ...PAYLOAD_LEAD,
      queryDigest[DIGEST_INDICES[0]],
      queryDigest[DIGEST_INDICES[1]],
      emptyDigest[DIGEST_INDICES[0]],
      emptyDigest[DIGEST_INDICES[1]],
      userAgentDigest[DIGEST_INDICES[0]],
      userAgentDigest[DIGEST_INDICES[1]],
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

    const merged = this.interleave(this.splitEvenOdd(payload))
    const encrypted = this.rc4Encrypt(PAYLOAD_KEY, Buffer.from(merged))
    const garbled = String.fromCharCode(...ENVELOPE_LEAD) + encrypted.toString('latin1')

    /* 每三个字节编成四个字符；恰好 21 字节，除不尽的部分（本来也没有）不编 */
    let xbogus = ''
    for (let index = 0; index + 2 < garbled.length; index += 3) {
      xbogus += this.encodeGroup(garbled.charCodeAt(index), garbled.charCodeAt(index + 1), garbled.charCodeAt(index + 2))
    }

    const fullUrl = url.includes('?') ? `${url}&X-Bogus=${xbogus}` : `${url}?X-Bogus=${xbogus}`

    return { fullUrl, xbogus, userAgent }
  }
}
