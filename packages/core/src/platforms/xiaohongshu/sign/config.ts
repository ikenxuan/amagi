import { DEFAULT_UA } from '../../../contracts/ua'
import { CryptoConfig, getPlatformCode, platformFromUserAgent } from './xhshow'

/**
 * 小红书 Web 端的**运行时版本号** —— 真机抓包实测，比库默认值新。
 *
 * 2026-10-12 对真实游客会话抓包：`webBuild` cookie 是 `6.57.2`，webprofile 请求体里的
 * `sdkVersion` 是 `"4.4.3"`。库默认是 `6.56.3` / `4.3.5`（上游 2026-09-25 测）——
 * 站点构建号随发版递增，所以这里钉更新的那组。
 *
 * 两个值的去向不同，**都不是只影响一个地方**：
 * - `DATA_WEB_BUILD` → 游客 CK 的 `webBuild` cookie；而 x-s-common 的 `x4` 自上游 v1.2.0
 *   起会**优先读这个 cookie**（见 `xhshow/core/commonSign.ts`），所以它同时决定了请求头里的 x4。
 * - `DATA_SDK_VERSION` → webprofile（gid）请求体的 `sdkVersion`。
 */
const WEB_BUILD = '6.57.2'
const SDK_VERSION = '4.4.3'

/**
 * 前端 `getPlatformCode()` 的等价实现，`x-s-common` 的 `s0` 与 a1 平台位共用。
 *
 * 前端枚举里 `Windows = 0`，但 switch 没有 Windows 分支，Windows 与未知平台都落
 * `other(5)`（2026-09-25 真机 Edge 153 实测 `s0 = 5`、a1 尾部 `50000`）。判定细节在
 * `xhshow/config/platform.ts`：先判 iOS / Android，再判 Mac / Linux。
 * @param userAgent - 实际发请求用的 UA
 * @returns 平台码 1~5
 */
export const xiaohongshuPlatformCode = (userAgent?: string): number => getPlatformCode(platformFromUserAgent(userAgent))

/**
 * 初始化小红书签名配置。
 *
 * 先用 `withOverrides` 钉上面那组真机版本号，再 `forUserAgent` 按 UA 派生 `s0` / `x2` /
 * `DATA_PLATFORM` / `PUBLIC_USERAGENT`。**顺序不能反**：`withOverrides` 从全新实例起步，
 * 放在后面会把 UA 派生的字段冲掉。两步都不整体替换模板，`x12` 这个 getter 保持每次求值。
 *
 * 不传 UA 时按默认 UA（Windows）取值，与请求头的默认 UA 同源 —— 所以不会落到
 * `forUserAgent` 认不出平台时的 `'PC'`。
 * @param userAgent - 实际发请求用的 UA
 * @returns 版本号与平台字段都已就位的签名配置
 */
export const createXiaohongshuCryptoConfig = (userAgent?: string): CryptoConfig =>
  new CryptoConfig().withOverrides({ DATA_WEB_BUILD: WEB_BUILD, DATA_SDK_VERSION: SDK_VERSION }).forUserAgent(userAgent ?? DEFAULT_UA)
