/**
 * 浏览器指纹基线（UA / Sec-Ch-Ua）。
 *
 * 四个平台的 `config.ts` 全部从这里取基线，**版本号集中维护** ——
 * 升级浏览器指纹只改这一个文件，不必逐平台改。
 *
 * `contracts/` 是零依赖叶子层：本文件不 import 仓库内任何其他模块。
 */

/** 默认 UA：四平台共用，版本号在此集中维护 */
export const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

/**
 * 移动端 UA（iPhone Safari 17）：快手 H5 命名空间 `c.kuaishou.com/rest/wd/*` 用它。
 *
 * 那套 `/rest/wd/*` 是微信 / 手机浏览器打开分享页时调的接口，所以这个命名空间按
 * 移动端 UA 请求，与页面的实际来源一致；桌面 UA 与移动 UA 拿到的响应形状并不相同，
 * 而移动端各家之间没有差别 —— 实测数种 App UA（含 `Kwai/` / `ksNebula/`）
 * 返回完全一致。所以这里只需要**一份**移动 UA，不必伪装成快手 App。
 *
 * 与 {@link DEFAULT_UA} 一样放在这里而不是放进 `platforms/kuaishou/`：UA 的版本号
 * 集中一处维护，升级只改这个文件。
 */
export const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

/** Chromium `GetGreasedUserAgentBrandVersion` 的三张表：品牌位次、GREASE 字符、GREASE 版本 */
const GREASE_ORDERS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0]
] as const
const GREASE_CHARS = [' ', '(', ':', '-', '.', '/', ')', ';', '=', '?', '_']
const GREASE_VERSIONS = ['8', '99', '24']

/** UA 声明的浏览器身份，见 {@link browserOf} */
export interface BrowserIdentity {
  /** 浏览器名，即抖音 Web 参数 `browser_name` 的取值 */
  name: 'Chrome' | 'Edge'
  /** 浏览器自己的版本：Edge 取 `Edg/`，Chrome 取 `Chrome/` */
  version: string
  /** Chromium 内核版本，取 `Chrome/` */
  engineVersion: string
}

/**
 * 从 UA 认出浏览器。Edge 的 UA 同时写着 `Chrome/` 和 `Edg/`，所以先认 `Edg/`。
 *
 * 2026-10-07 Edge 154 打开抖音，`/aweme/v1/web/*` 发的是 `browser_name=Edge`、
 * `browser_version=154.0.0.0`：前端按 UA 报浏览器名，不会统一成 Chrome。
 * 版本号要四段；认不出时回落到 {@link DEFAULT_UA} 的 Chrome 版本。
 * @param userAgent - 用户代理字符串
 * @returns 浏览器名、浏览器版本与内核版本
 */
export const browserOf = (userAgent: string = DEFAULT_UA): BrowserIdentity => {
  const chrome = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)?.[1]
  const edge = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/)?.[1]
  const engineVersion = chrome ?? edge ?? DEFAULT_UA.match(/Chrome\/([\d.]+)/)?.[1] ?? '142.0.0.0'
  return edge ? { name: 'Edge', version: edge, engineVersion } : { name: 'Chrome', version: engineVersion, engineVersion }
}

/**
 * 根据 User-Agent 生成对应的 Sec-Ch-Ua 值。
 *
 * 品牌顺序和 GREASE 品牌名都由 Chromium 主版本号决定（`GetGreasedUserAgentBrandVersion`），
 * 不是固定串：2026-10-07 Edge 154 实测 `"Chromium";v="154", "Microsoft Edge";v="154", "Not A(Brand";v="99"`
 * 与按版本号推算逐字符一致。UA 带 `Edg/` 时品牌是 `Microsoft Edge`，否则是 `Google Chrome`。
 *
 * 回落的 Chrome 版本优先取自 {@link DEFAULT_UA}，保证两者声明的最低版本一致。
 * @param userAgent - 用户代理字符串
 * @returns 对应的 Sec-Ch-Ua 值
 */
export const generateSecChUa = (userAgent: string): string => {
  const chromeVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] ?? DEFAULT_UA.match(/Chrome\/(\d+)/)?.[1] ?? '125'
  const edgeVersion = userAgent.match(/Edg\/(\d+)/)?.[1]
  const seed = Number(chromeVersion)
  const order = GREASE_ORDERS[seed % 6]
  const brands: string[] = []
  brands[order[0]] = `"Not${GREASE_CHARS[seed % 11]}A${GREASE_CHARS[(seed + 1) % 11]}Brand";v="${GREASE_VERSIONS[seed % 3]}"`
  brands[order[1]] = `"Chromium";v="${chromeVersion}"`
  brands[order[2]] = edgeVersion ? `"Microsoft Edge";v="${edgeVersion}"` : `"Google Chrome";v="${chromeVersion}"`
  return brands.join(', ')
}
