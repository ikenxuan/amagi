/**
 * 平台判定：把 UA 映射成小红书前端签名里用到的那几个平台量。
 *
 * 前端 `vendor-dynamic.js` 里有一个枚举和一个 switch，两者一起决定
 * `x-s-common` 的 `s0` 与 `x2`：
 *
 * ```js
 * PlatformCode: Windows=0, iOS=1, Android=2, MacOs=3, Linux=4, other=5
 *
 * function getPlatformCode (e) {
 *   switch (e) {
 *     case "Android": return PlatformCode.Android
 *     case "iOS":     return PlatformCode.iOS
 *     case "Mac OS":  return PlatformCode.MacOs
 *     case "Linux":   return PlatformCode.Linux
 *     default:        return PlatformCode.other
 *   }
 * }
 * ```
 *
 * 那个 switch **没有 `case "Windows"`** —— Windows 落到 `default`，于是它的 `s0`
 * 是 5（other）而不是枚举里的 0。这不是前端的 bug，是必须照抄的行为：
 * 2026-09-25 真机 Edge 153 登录态抓下来的 `x-s-common` 解出来就是
 * `{"s0":5,"x2":"Windows",...}`。
 *
 * a1 Cookie 尾部那一位平台码走的是另一条路径（前端 `generateLocalId`），但用的是
 * **同一套映射** —— 同一次实测里 a1 尾部是 `"50000"`，平台位也是 `5`。于是
 * `PlatformCode.Windows = 0` 在 Web 端两条路径上都产不出来。
 */

/** 前端 `PlatformCode` 枚举原值。照录用，Web 端实际只会取到 1~5。 */
export const PLATFORM_CODE = {
  Windows: 0,
  iOS: 1,
  Android: 2,
  MacOs: 3,
  Linux: 4,
  other: 5
} as const

/** 前端 `e.platform` 取值；注意 `Mac OS` 中间有空格，switch 按字面量匹配。 */
export type XhsPlatform = 'Windows' | 'iOS' | 'Android' | 'Mac OS' | 'Linux'

/** 认不出平台时前端用的兜底值（`x2: u || "PC"`）。 */
export const XHS_PLATFORM_FALLBACK = 'PC'

/**
 * 从 UA 推断平台名，对应前端的 `e.platform`。
 *
 * 判定顺序要紧：iOS 的 UA 里带 `Mac OS X`，Android 的 UA 里带 `Linux`，
 * 所以移动端必须先判，否则 iPhone 会被认成 Mac、Android 会被认成 Linux。
 * @param userAgent - 实际发请求用的 UA
 * @returns 平台名；认不出时返回 undefined，由调用方决定兜底
 */
export function platformFromUserAgent(userAgent?: string): XhsPlatform | undefined {
  if (!userAgent) return undefined
  const ua = userAgent.toLowerCase()

  if (/iphone|ipad|ipod/.test(ua)) return 'iOS'
  if (/android/.test(ua)) return 'Android'
  if (/windows|win64|win32/.test(ua)) return 'Windows'
  if (/mac os x|macintosh/.test(ua)) return 'Mac OS'
  if (/linux|x11|cros/.test(ua)) return 'Linux'
  return undefined
}

/**
 * 复刻前端 `getPlatformCode`，产出 `x-s-common` 的 `s0`。
 *
 * 刻意保留「没有 Windows 分支」这个行为 —— Windows 必须落到 `other`(5)。
 * 把它"修正"成 0 会让签名与真实浏览器不一致。
 * @param platform - 平台名，取自 {@link platformFromUserAgent}
 * @returns `s0` 的取值
 */
export function getPlatformCode(platform?: string): number {
  switch (platform) {
    case 'Android':
      return PLATFORM_CODE.Android
    case 'iOS':
      return PLATFORM_CODE.iOS
    case 'Mac OS':
      return PLATFORM_CODE.MacOs
    case 'Linux':
      return PLATFORM_CODE.Linux
    default:
      return PLATFORM_CODE.other
  }
}

/**
 * a1 Cookie 尾部那一位平台码。
 *
 * **与 {@link getPlatformCode} 是同一套映射** —— 2026-09-25 真机 Edge 153 的 a1
 * 实测尾部为 `"50000"`，即 Windows 的平台位是 `'5'`(other) 而不是枚举里的 0，
 * 与同一次抓包的 `x-s-common.s0 = 5` 一致。所以 `PLATFORM_CODE.Windows = 0`
 * 这一项在 Web 端两条路径上都产不出来，留着只是为了照录前端的枚举。
 *
 * a1 的整体结构（同一次实测验证）：长度 52 = body(46) + checksum(6)，
 * body 为 `十六进制时间戳 + 随机段 + 平台码(1) + "0000"`，
 * 且 `String(crc32(body)).slice(0, 6) === a1.slice(46)`。
 * @param userAgent - 生成 a1 时所用的 UA，必须与实际请求 UA 一致
 * @returns 一位十进制字符
 */
export function a1PlatformDigit(userAgent?: string): string {
  return String(getPlatformCode(platformFromUserAgent(userAgent)))
}

/**
 * `XYW_` 载荷里 `x2` 那 19 位环境标志的真实浏览器取值。
 *
 * **这一串不按 OS 变，别给它建平台查表。** 2026-09-25 同机对照实测：
 *
 * | 环境 | `navigator.webdriver` | 第 11 位 |
 * | --- | --- | --- |
 * | Windows 真机 Edge 153（登录态） | `false` | `0` |
 * | Windows 自动化 Chrome 154 | `true` | `1` |
 *
 * 同一台机器、同一个 OS，只有自动化状态不同，第 11 位就翻转 —— 它测的是
 * webdriver，不是平台。此前有份调研归档把「第 11 位为 1」记成 Linux 的特征，
 * 那是在沙箱里抓的，测到的其实是沙箱自身的自动化标志。照那个建按 OS 查表的话，
 * 跑在 Linux 服务器上的签名会主动自报自动化特征，等于给风控送判据。
 *
 * 真正随平台变的是 `x-s-common` 的 `s0` 与 `x2`，见本文件上面两个函数。
 */
export const XYW_ENV_FLAGS_BROWSER = '0|0|0|1|0|0|1|0|0|0|1|0|0|0|0|1|0|0|0'
