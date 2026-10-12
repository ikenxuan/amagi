import { getPlatformCode, platformFromUserAgent, XHS_PLATFORM_FALLBACK, XYW_ENV_FLAGS_BROWSER } from './platform'

// Fallback session start for x-s-common, shared by this loaded module.
const XHS_SESSION_START_MS = Date.now()

export class CryptoConfig {
  // Gid encrypt parameters
  DES_KEY = 'zbp30y86'
  GID_URL = 'https://as.xiaohongshu.com/api/sec/v1/shield/webprofile'
  DATA_PLATFORM = 'Windows'
  DATA_SVN = '2'
  DATA_SDK_VERSION = '4.3.5'
  // 站点构建号，下游拿它铸 webBuild Cookie。x-s-common 的 x4 与它同源，
  // 所以 XsCommonSigner 会优先读 Cookie 里的 webBuild，这里只是兜底默认值。
  // 2026-09-25 真机实测为 6.56.3（此前钉的 6.3.0 已过期）。
  DATA_WEB_BUILD = '6.56.3'

  // Bitwise operation constants
  MAX_32BIT = 0xffffffff
  MAX_SIGNED_32BIT = 0x7fffffff
  MAX_BYTE = 255

  // Base64 encoding constants
  STANDARD_BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  CUSTOM_BASE64_ALPHABET = 'ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5'
  X3_BASE64_ALPHABET = 'MfgqrsbcyzPQRStuvC7mn501HIJBo2DEFTKdeNOwxWXYZap89+/A4UVLhijkl63G'

  // XOR key for payload transformation (144 bytes)
  HEX_KEY =
    '71a302257793271ddd273bcee3e4b98d9d7935e1da33f5765e2ea8afb6dc77a51a499d23b67c20660025860cbf13d4540d92497f58686c574e508f46e1956344f39139bf4faf22a3eef120b79258145b2feb5193b6478669961298e79bedca646e1a693a926154a5a7a1bd1cf0dedb742f917a747a1e388b234f2277516db7116035439730fa61e9822a0eca7bff72d8'

  // Hexadecimal processing constants
  EXPECTED_HEX_LENGTH = 32
  OUTPUT_BYTE_COUNT = 8
  HEX_CHUNK_SIZE = 2

  // Payload construction constants
  VERSION_BYTES = [121, 104, 96, 41]
  PAYLOAD_LENGTH = 144
  A1_LENGTH = 52
  APP_ID_LENGTH = 10
  MD5_XOR_LENGTH = 8
  A3_PREFIX = [2, 97, 51, 16]
  TIMESTAMP_LE_LENGTH = 8

  // Random value ranges
  SEQUENCE_VALUE_MIN = 15
  SEQUENCE_VALUE_MAX = 50
  WINDOW_PROPS_LENGTH_MIN = 1000
  WINDOW_PROPS_LENGTH_MAX = 1200

  // Session management constants
  SESSION_WINDOW_PROPS_INIT_MIN = 1000
  SESSION_WINDOW_PROPS_INIT_MAX = 2000

  SESSION_SEQUENCE_INIT_MIN = 15
  SESSION_SEQUENCE_INIT_MAX = 17
  SESSION_SEQUENCE_STEP_MIN = 0
  SESSION_SEQUENCE_STEP_MAX = 1
  SESSION_WINDOW_PROPS_STEP_MIN = 1
  SESSION_WINDOW_PROPS_STEP_MAX = 10

  // Checksum constants (16 bytes total)
  CHECKSUM_VERSION = 1
  CHECKSUM_XOR_KEY = 115
  CHECKSUM_FIXED_TAIL = [249, 65, 103, 103, 201, 181, 129, 99, 94, 7, 68, 250, 132, 21]

  // Environment detection constants (15 values for part11 XOR)
  ENV_TABLE = [115, 248, 83, 102, 103, 201, 181, 131, 99, 94, 4, 68, 250, 132, 21]

  // Default environment check values (normal browser)
  //
  // 2026-09-26 解开页面自己签出的 x3：页面刚加载时依次用 mns0201_ / mns0101_ 档位，
  // env 尾部也不同；约 1 秒后稳定在 mns0301_，尾部为
  // f9 41 67 67 c9 b5 81 63 5e 07 44 fa 84 15，对应这里第 7 位为 2（旧值 0）。
  // 另一批探针样本里第 5 位是 1（原因未查明），这里取上述会话里的 0。
  ENV_CHECKS_DEFAULT = [0, 1, 18, 1, 0, 0, 0, 2, 0, 0, 3, 0, 0, 0, 0]

  // custom_hash_v2 initial vector
  HASH_IV: [number, number, number, number] = [1831565813, 461845907, 2246822507, 3266489909]

  // Environment fingerprint generation parameters
  ENV_FINGERPRINT_XOR_KEY = 41
  ENV_FINGERPRINT_TIME_OFFSET_MIN = 10
  ENV_FINGERPRINT_TIME_OFFSET_MAX = 50

  // Signature data template
  //
  // 上游 v0.2.0 使用 x0="4.3.5"，根据 Cloxl/xhshow issue #110
  // (https://github.com/Cloxl/xhshow/issues/110)，该版本号已导致小红书服务器对
  // 翻页请求（非空 cursor）静默返回空 data，需修正为 x0="4.4.3"。
  //
  // 这里只放 x0~x4 的默认值。签名时 signXs 会按前端 seccore_signv2 补齐其余字段：
  // x4 = POST 为 'object'、GET 为 ''；x5 = 签名内容串的 MD5；会话带 webSsk 时
  // 再加 x6/x7（见 core/ssk.ts）。2026-09-25 对页面自己签出的 21 条 XYS_ 逐字节核对一致。
  SIGNATURE_DATA_TEMPLATE: Record<string, string> = {
    x0: '4.4.3',
    x1: 'xhs-pc-web',
    x2: 'Windows',
    x3: '',
    x4: ''
  }

  // webSsk 交换用的服务端 X25519 公钥（前端 vendor-dynamic.js 里的常量），
  // 传给 createWebSskExchange。
  SSK_SERVER_PUBLIC_KEY = 'Kr0iygsCu3inYJNXCL4k4JuzaYQ2afI1xbwc7BH6sm8='

  // Prefix constants
  X3_PREFIX = 'mns0301_'
  XYS_PREFIX = 'XYS_'
  XYW_PREFIX = 'XYW_'

  // XYW format constants (used by data-fetching APIs to bypass 406)
  XYW_SIGN_SVN = '56'
  XYW_SIGN_TYPE = 'x2'
  XYW_SIGN_VERSION = '1'
  XYW_AES_KEY = '7cc4adla5ay0701v'
  XYW_AES_IV = '4uzjr7mbsibcaldp'
  // 真实（非自动化）浏览器的 19 位环境标志。此前这里最后一位是 1，与真机不符；
  // 2026-09-25 真机 Edge 153 实测为下面这串。第 11 位测的是 webdriver 而非平台，
  // 所以这一串不随 OS 变 —— 详见 ./platform.ts 里 XYW_ENV_FLAGS_BROWSER 的说明。
  XYW_ENV_FLAGS_DEFAULT = XYW_ENV_FLAGS_BROWSER

  // Trace ID generation constants
  HEX_CHARS = 'abcdef0123456789'
  XRAY_TRACE_ID_SEQ_MAX = 8388607 // 2^23-1
  XRAY_TRACE_ID_TIMESTAMP_SHIFT = 23
  XRAY_TRACE_ID_PART1_LENGTH = 16
  XRAY_TRACE_ID_PART2_LENGTH = 16
  B3_TRACE_ID_LENGTH = 16

  // b1 secret key
  B1_SECRET_KEY = 'xhswebmplfbt'

  // x-rap-param protocol version from the 2026-09-20 browser capture
  XRAP_SDK_VERSION = 10301

  // x-rap-param 分组密码的 16 字节主密钥。它经标准 AES-128 密钥展开（S 盒换成
  // xrap.ts 里那张自定义表）即可推出全部 11 组轮密钥，见 expandXrapKey。
  // 平台轮换密钥时改这 16 字节即可，不必重新逆常量池。
  XRAP_MASTER_KEY = 'kqI1DTcwKX90ZtAy'

  SIGNATURE_XSCOMMON_TEMPLATE: Record<string, any> = {
    // s0 与 x2 是平台派生值，不是常量：这里的默认值对应 Windows
    // （Windows 在前端 getPlatformCode 里落到 other=5）。换平台请用 forUserAgent()。
    s0: 5,
    s1: '',
    x0: '1',
    x1: '4.4.3',
    x2: 'Windows',
    x3: 'xhs-pc-web',
    // 2026-09-25 真机 Edge 153 登录态实测；此前钉的 6.53.4 已过期
    x4: '6.56.3',
    x5: '',
    x6: '',
    x7: '',
    x8: '',
    x9: -596800761,
    x10: 0,
    x11: 'normal',
    // Object spread in XsCommonSigner evaluates this for every signature.
    get x12() {
      return `${Date.now()};${XHS_SESSION_START_MS}`
    }
  }

  PUBLIC_USERAGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'

  /**
   * Create a new config instance with overridden values
   */
  withOverrides(overrides: Partial<CryptoConfig>): CryptoConfig {
    const newConfig = new CryptoConfig()
    Object.assign(newConfig, overrides)
    return newConfig
  }

  /**
   * 按 UA 派生出平台相关的那几个字段，返回新实例（不改动当前实例）。
   *
   * 会跟着 UA 变的只有三处，都经真机验证过是平台绑定的：
   *
   * - `SIGNATURE_XSCOMMON_TEMPLATE.s0` —— 复刻前端 `getPlatformCode`，
   *   Windows 落 `other`(5)、Mac OS 是 3、Linux 是 4、iOS 1、Android 2
   * - `SIGNATURE_XSCOMMON_TEMPLATE.x2` 与 `SIGNATURE_DATA_TEMPLATE.x2` ——
   *   平台名字符串，认不出时用前端的兜底值 `'PC'`
   * - `DATA_PLATFORM` —— webprofile（gid）请求体里的平台名
   * - `PUBLIC_USERAGENT` —— b1 指纹直接把 UA 写进 `fingerprint.x1`，必须跟着一起换
   *
   * `XYW_ENV_FLAGS_DEFAULT` 刻意**不**跟着 UA 变：那 19 位里唯一观测到会变的是
   * webdriver 位，与 OS 无关，详见 `./platform.ts`。
   *
   * 与 {@link withOverrides} 可组合，后者优先：
   * ```ts
   * new CryptoConfig().forUserAgent(ua).withOverrides({ DATA_WEB_BUILD: '6.12.3' })
   * ```
   * @param userAgent - 实际发请求用的 UA；认不出平台时退回 `'PC'`
   * @returns 平台字段已就位的新配置实例
   */
  forUserAgent(userAgent?: string): CryptoConfig {
    const platform = platformFromUserAgent(userAgent)
    const platformName = platform ?? XHS_PLATFORM_FALLBACK
    const field = (value: unknown): PropertyDescriptor => ({ value, enumerable: true, writable: true, configurable: true })

    // 按属性描述符复制：SIGNATURE_XSCOMMON_TEMPLATE.x12 是 getter，
    // 用对象展开会把它求值成一个固定字符串，请求时间就不再每次刷新了。
    const xsCommonTemplate = Object.defineProperties(
      {},
      {
        ...Object.getOwnPropertyDescriptors(this.SIGNATURE_XSCOMMON_TEMPLATE),
        s0: field(getPlatformCode(platform)),
        x2: field(platformName)
      }
    ) as Record<string, any>

    return this.withOverrides({
      ...this,
      // b1 指纹里直接带 UA（fingerprint.x1），不一起换的话会出现
      // 「s0/x2 说 Mac、指纹说 Windows」这种自相矛盾的签名。
      ...(userAgent ? { PUBLIC_USERAGENT: userAgent } : {}),
      DATA_PLATFORM: platformName,
      SIGNATURE_DATA_TEMPLATE: { ...this.SIGNATURE_DATA_TEMPLATE, x2: platformName },
      SIGNATURE_XSCOMMON_TEMPLATE: xsCommonTemplate
    })
  }
}
