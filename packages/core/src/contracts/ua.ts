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

/**
 * 根据 User-Agent 生成对应的 Sec-Ch-Ua 值。
 *
 * 回落的 Chrome 版本优先取自 {@link DEFAULT_UA}，保证两者声明的最低版本一致。
 * @param userAgent - 用户代理字符串
 * @returns 对应的 Sec-Ch-Ua 值
 */
export const generateSecChUa = (userAgent: string): string => {
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/)
  const chromeVersion = chromeMatch ? chromeMatch[1] : (DEFAULT_UA.match(/Chrome\/(\d+)/)?.[1] ?? '125')
  return `"Not_A Brand";v="99", "Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`
}
