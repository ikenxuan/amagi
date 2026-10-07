import { CryptoConfig, getPlatformCode, platformFromUserAgent } from '@ikenxuan/xhshow-ts'

import { DEFAULT_UA } from '../../../contracts/ua'

/**
 * 前端 `getPlatformCode()` 的等价实现，`x-s-common` 的 `s0` 与 a1 平台位共用。
 *
 * 前端枚举里 `Windows = 0`，但 switch 没有 Windows 分支，Windows 与未知平台都落
 * `other(5)`（2026-09-25 真机 Edge 153 实测 `s0 = 5`、a1 尾部 `50000`）。判定细节在
 * xhshow-ts 里：先判 iOS / Android，再判 Mac / Linux。
 * @param userAgent - 实际发请求用的 UA
 * @returns 平台码 1~5
 */
export const xiaohongshuPlatformCode = (userAgent?: string): number => getPlatformCode(platformFromUserAgent(userAgent))

/**
 * 初始化签名配置。
 *
 * 签名默认值（`x1=4.4.3`、`x4` 与 `webBuild` Cookie 同为 `6.56.3`、XRAP `10301`、
 * x3 env 尾部、`x12` 的请求时间 / 会话时间）都由 xhshow-ts 提供；`s0` / `x2` /
 * `DATA_PLATFORM` 由 `forUserAgent` 按 UA 派生，认不出平台时 `x2` 退回 `'PC'`。
 * 不传 UA 时按默认 UA（Windows）取值，与请求头的默认 UA 同源。
 * @param userAgent - 实际发请求用的 UA
 * @returns 平台字段已就位的签名配置
 */
export const createXiaohongshuCryptoConfig = (userAgent?: string): CryptoConfig => new CryptoConfig().forUserAgent(userAgent ?? DEFAULT_UA)
