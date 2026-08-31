/**
 * a_bogus 签名（bdms 1.0.1.19 形态，passport 登录接口使用）
 *
 * 抖音同时在线着多个 a_bogus 版本：`@ikenxuan/amagi` 里带的是 web 数据接口用的旧版
 * （盐值 `cus`、pageId 6241），而 login.douyin.com 的 passport SDK 用的是本文件实现的
 * 新版（盐值 `dhzx`、pageId 7571、sdkVersion 1.0.1.19-fix.01）。两者互不通用，
 * 所以这里单独实现一份，不复用 amagi 的签名。
 *
 * 算法为社区公开的逆向结论（见 PR 说明中的参考链接），此处按 kkk 的代码风格重写：
 * - SM3 为抖音变体（连续两次摘要），见 ./sm3
 * - RC4 为变体：S 盒递减初始化 + `j = (j * S[i] + j + K[i]) % 256`
 * - Base64 使用自定义字符表，UA 段用 s3、最终结果用 s4
 * - `random()` 保留了原实现里 `Math.random`（函数对象而非调用）参与位运算的行为，
 *   该表达式恒为 NaN → 位运算结果恒为 0，这里直接写成常量而不是照抄错误代码
 */
import { sm3, sm3Twice } from './sm3'

/** RC4 / S 盒长度 */
const BOX_SIZE = 256

/** bdms 1.0.1.19 的盐值 */
const SALT = 'dhzx'

/** bdms SDK 版本号，同时也是 passport 通用参数里的 p_bd */
export const BDMS_SDK_VERSION = '1.0.1.19-fix.01'

/** passport 登录 SDK 的 aid */
const AID = 6383

/** passport 登录页的 pageId */
const PAGE_ID = 7571

/** 版本号基准时间戳（bdms 内部按 14 天为一档计数） */
const VERSION_EPOCH = 1721836800000

/** 模块加载时刻，等价于浏览器里的「进入页面时间」 */
const ENTER_PAGE_TS = Date.now()

/** 自定义 Base64 字符表 */
const BASE64_TABLES: Record<string, string> = {
  s0: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
  s1: 'Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=',
  s2: 'Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=',
  s3: 'ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe',
  s4: 'Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe'
}

/**
 * 浏览器环境快照。服务器上没有真实窗口，这里给出一组常见的桌面分辨率组合；
 * 该值只影响指纹内容本身，不需要与任何真实设备对应。
 */
const BROWSER_ENV = {
  innerWidth: 2048,
  innerHeight: 960,
  outerWidth: 2554,
  outerHeight: 1386,
  availWidth: 2560,
  availHeight: 1392,
  sizeWidth: 2560,
  sizeHeight: 1440,
  platform: 'Win32'
}

/** RC4 密钥：bdms 用 `[1 / 256, 1 % 256, 14 % 256]` 造出 "\x00\x01\x0e" */
const rc4Key = String.fromCharCode(...[1 / BOX_SIZE, 1 % BOX_SIZE, 14 % BOX_SIZE])

/**
 * 变体 RC4
 * @param key 密钥
 * @param text 明文（按 charCode 处理）
 */
const rc4 = (key: string, text: string): string => {
  const s = new Uint8Array(BOX_SIZE)
  const k = new Uint8Array(BOX_SIZE)
  for (let i = 0; i < BOX_SIZE; i++) {
    s[i] = BOX_SIZE - 1 - i
    k[i] = key.charCodeAt(i % key.length)
  }

  let j = 0
  for (let i = 0; i < BOX_SIZE; i++) {
    j = (j * s[i] + j + k[i]) % BOX_SIZE
    ;[s[i], s[j]] = [s[j], s[i]]
  }

  let x = 0
  let y = 0
  let cipher = ''
  for (let n = 0; n < text.length; n++) {
    x = (x + 1) % BOX_SIZE
    y = (y + s[x]) % BOX_SIZE
    ;[s[x], s[y]] = [s[y], s[x]]
    cipher += String.fromCharCode(text.charCodeAt(n) ^ s[(s[x] + s[y]) % BOX_SIZE])
  }
  return cipher
}

/**
 * 自定义字符表 Base64
 * @param input 明文（按 charCode 取低 8 位）
 * @param table 字符表名（s0 ~ s4）
 */
const base64 = (input: string, table: keyof typeof BASE64_TABLES): string => {
  const alphabet = BASE64_TABLES[table]
  let output = ''
  let i = 0
  while (i < input.length) {
    const c1 = input.charCodeAt(i++)
    const c2 = input.charCodeAt(i++)
    const c3 = input.charCodeAt(i++)
    const chunk = ((c1 & 0xff) << 16) | (Number.isNaN(c2) ? 0 : (c2 & 0xff) << 8) | (Number.isNaN(c3) ? 0 : c3 & 0xff)
    output += alphabet.charAt((chunk >> 18) & 0x3f)
    output += alphabet.charAt((chunk >> 12) & 0x3f)
    output += Number.isNaN(c2) ? '=' : alphabet.charAt((chunk >> 6) & 0x3f)
    output += Number.isNaN(c3) ? '=' : alphabet.charAt(chunk & 0x3f)
  }
  return output
}

/**
 * 生成 4 字节随机混淆段
 * @param seed 两字节的基准值
 * @param flag 0 = 完全随机；1 = 高位固定为 0；2 = 低位受限、高位固定为 178
 */
const mix = (seed: [number, number], flag: 0 | 1 | 2): number[] => {
  const r = (Math.random() * 65535) | 0
  let low = r & 0xff
  let high = (r >> 8) & 0xff

  if (flag === 1) {
    // 原实现此处为 `(Math.random * 40) >> 0`（漏了调用），结果恒为 0
    high = 0
  }
  if (flag === 2) {
    low = (Math.random() * 240) >> 0
    if (low > 109) low += (low % 2) + 1
    // 原实现此处为 `((Math.random * 255) >> 0) & 77`（同样恒为 0），随后按位置位
    high = (1 << 1) | (1 << 4) | (1 << 5) | (1 << 7)
  }

  return [
    (low & 0xaa) | (seed[0] & 0x55),
    (low & 0x55) | (seed[0] & 0xaa),
    (high & 0xaa) | (seed[1] & 0x55),
    (high & 0x55) | (seed[1] & 0xaa)
  ]
}

/** SDK 版本号拆成数字数组，非纯数字段（如 `19-fix`）取 0 */
const versionSegments = (version: string): number[] => version.split('.').map((segment) => ~~Number(segment))

/** 每 3 字节扩成 4 字节，掺入随机位 */
const spread = (bytes: number[]): number[] => {
  const masks = [145, 110, 66, 189, 44, 211]
  const out: number[] = []
  for (let i = 0; i < bytes.length; i += 3) {
    if (i + 2 >= bytes.length) {
      out.push(bytes[i])
      if (bytes[i + 1] !== undefined) out.push(bytes[i + 1])
      continue
    }
    const noise = (Math.random() * 1000) & 0xff
    out.push(
      (noise & masks[0]) | (bytes[i] & masks[1]),
      (noise & masks[2]) | (bytes[i + 1] & masks[3]),
      (noise & masks[4]) | (bytes[i + 2] & masks[5]),
      (bytes[i] & masks[0]) | (bytes[i + 1] & masks[2]) | (bytes[i + 2] & masks[4])
    )
  }
  return out
}

/**
 * 生成 a_bogus
 * @param query 除 a_bogus 之外的完整查询串（未加 `?`，保持实际发送顺序）
 * @param userAgent 与请求头一致的 UA
 * @returns a_bogus 参数值（未做 URL 编码）
 */
export const aBogus = (query: string, userAgent: string): string => {
  const salted = query.endsWith(SALT) ? query : query + SALT
  const queryDigest = sm3Twice(salted)
  const saltDigest = sm3Twice(SALT)
  const uaEncoded = base64(rc4(rc4Key, userAgent), 's3')
  const uaDigest = sm3(uaEncoded)

  const now = Date.now()
  const ink = now - 1

  /** 指纹字节表，下标沿用 bdms 内部编号，便于与逆向资料对照 */
  const b: Record<number, number> = {}

  b[24] = 41
  b[26] = ((now - VERSION_EPOCH) / 1000 / 60 / 60 / 24 / 14) >> 0
  b[27] = 6
  b[28] = (now - ENTER_PAGE_TS + 3) & 0xff
  b[29] = now & 0xff
  b[30] = (now >> 8) & 0xff
  b[31] = (now >> 16) & 0xff
  b[32] = (now >> 24) & 0xff
  b[33] = (now / 2 ** 32) & 0xff
  b[34] = (now / 2 ** 40) & 0xff
  b[35] = 1
  b[36] = 0
  b[38] = 129
  b[39] = 0
  b[40] = 0
  b[41] = 0
  b[42] = 0
  b[43] = 0
  b[44] = 14
  b[45] = 0
  b[46] = 0
  b[47] = 0
  b[48] = queryDigest[9]
  b[49] = queryDigest[18]
  b[51] = queryDigest[3]
  b[52] = saltDigest[10]
  b[53] = saltDigest[19]
  b[55] = saltDigest[4]
  b[56] = uaDigest[11]
  b[57] = uaDigest[21]
  b[59] = uaDigest[5]
  b[60] = ink & 0xff
  b[61] = (ink >> 8) & 0xff
  b[62] = (ink >> 16) & 0xff
  b[63] = (ink >> 24) & 0xff
  b[64] = (ink / 2 ** 32) & 0xff
  b[65] = (ink / 2 ** 40) & 0xff
  b[66] = 3
  b[67] = PAGE_ID & 0xff
  b[68] = (PAGE_ID >> 8) & 0xff
  b[69] = (PAGE_ID >> 16) & 0xff
  b[70] = (PAGE_ID >> 24) & 0xff
  b[71] = AID & 0xff
  b[72] = (AID >> 8) & 0xff
  b[73] = (AID >> 16) & 0xff
  b[74] = (AID >> 24) & 0xff

  const envSnapshot = Object.values(BROWSER_ENV).join('|')
  const envBytes = Array.from(envSnapshot, (char) => char.charCodeAt(0))
  b[79] = envBytes.length & 0xff
  b[80] = (envBytes.length >> 8) & 0xff

  const tail = `${(now + 3) & 0xff},`
  const tailBytes = Array.from(tail, (char) => char.charCodeAt(0))
  b[84] = tailBytes.length & 0xff
  b[85] = (tailBytes.length >> 8) & 0xff

  const version = versionSegments(BDMS_SDK_VERSION)
  const noise = mix([version[0], version[1]], 0).concat(mix([version[0], version[1]], 2))

  const checksumKeys = [
    24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 55, 56, 57, 59, 60, 61, 62,
    63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 79, 80, 84, 85
  ]
  const checksum = checksumKeys.reduce(
    (acc, key) => acc ^ b[key],
    noise.reduce((acc, value) => acc ^ value, 0)
  )

  /** 打乱后的字节顺序，与 bdms 内部的 tlist 一致 */
  const shuffled = [
    34, 44, 56, 61, 73, 29, 70, 45, 35, 49, 38, 66, 51, 68, 28, 48, 64, 47, 30, 71, 26, 55, 31, 69, 59, 40, 62, 63, 27, 72, 41, 74, 57, 52,
    42, 39, 33, 67, 53, 43, 65, 46, 36, 24, 60, 32, 79, 80, 84, 85
  ].map((key) => b[key])

  const payload = spread(shuffled.concat(envBytes, tailBytes, [checksum]))
  const prefix = String.fromCharCode(...mix([3, 82], 1))
  const encrypted = rc4(String.fromCharCode(211), String.fromCharCode(...noise.concat(payload)))

  return base64(prefix + encrypted, 's4')
}
