import { DEFAULT_UA } from '../../../contracts/ua'
import { CryptoConfig, getPlatformCode, platformFromUserAgent } from './xhshow'

/**
 * 小红书 Web 端的**运行时版本号** —— 真机抓包实测，比库默认值新。
 *
 * 2026-10-13 核对线上 `vendor-dynamic.26adca92.js`：x-s-common 里 `x4:"6.57.3"` 是字面量，
 * 入口 bundle 也用同一个版本号写 `webBuild` cookie；`x1` / webprofile 的 `sdkVersion` 是
 * `"4.4.3"`（库默认 `4.3.5`）。x4 只是前端发版号，不是签名算法版本 —— 同一次核对里
 * x-s-common 的字段结构、自定义 base64 表、CRC32 都与 xhshow 一致。平台发版后只改这一处。
 *
 * 两个值的去向不同，**都不是只影响一个地方**：
 * - `DATA_WEB_BUILD` → 游客 CK 的 `webBuild` cookie，也是 x-s-common 的 `x4`：签名优先读
 *   Cookie 里的 webBuild（见 `xhshow/core/commonSign.ts`），没有时读模板 x4 —— 库模板钉的是
 *   旧构建号，所以下面把模板 x4 也改成它，两者恒等。xhshow 子树保持与上游一致，不在那边改。
 * - `DATA_SDK_VERSION` → webprofile（gid）请求体的 `sdkVersion`。
 */
const WEB_BUILD = '6.57.3'
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
 * 先用 `withOverrides` 钉上面那组真机版本号（含 x-s-common 模板的 `x4`），再 `forUserAgent`
 * 按 UA 派生 `s0` / `x2` / `DATA_PLATFORM` / `PUBLIC_USERAGENT`。**顺序不能反**：
 * `withOverrides` 从全新实例起步，放在后面会把 UA 派生的字段冲掉。模板按属性描述符复制，
 * `x12` 这个 getter 保持每次求值。
 *
 * 不传 UA 时按默认 UA（Windows）取值，与请求头的默认 UA 同源 —— 所以不会落到
 * `forUserAgent` 认不出平台时的 `'PC'`。
 * @param userAgent - 实际发请求用的 UA
 * @returns 版本号与平台字段都已就位的签名配置
 */
export const createXiaohongshuCryptoConfig = (userAgent?: string): CryptoConfig => {
  const base = new CryptoConfig()
  const xsCommonTemplate = Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(base.SIGNATURE_XSCOMMON_TEMPLATE),
      x4: { value: WEB_BUILD, enumerable: true, writable: true, configurable: true }
    }
  ) as Record<string, any>
  return base
    .withOverrides({ DATA_WEB_BUILD: WEB_BUILD, DATA_SDK_VERSION: SDK_VERSION, SIGNATURE_XSCOMMON_TEMPLATE: xsCommonTemplate })
    .forUserAgent(userAgent ?? DEFAULT_UA)
}
