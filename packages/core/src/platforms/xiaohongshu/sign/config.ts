import { CryptoConfig } from './xhshow'

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
 * 初始化小红书签名配置。
 *
 * ## 为什么不再覆盖那两个模板
 *
 * 此前这里用对象字面量整个替换 `SIGNATURE_DATA_TEMPLATE` 与 `SIGNATURE_XSCOMMON_TEMPLATE`，
 * 用来把签名世代手工抬到真机的 `4.4.3` / `6.57.2`。**上游 v1.2.0 已经自己对齐了**
 * （x-s 的 `x0` 与 x-s-common 的 `x1` 默认值都是 `4.4.3`），所以那几处 override 已成冗余。
 *
 * 更要紧的是**留着它们会坏**：`SIGNATURE_XSCOMMON_TEMPLATE.x12` 是个 **getter**
 * （每次求值刷新时间戳 `${Date.now()};<会话起点>`），用对象字面量整个替换会把它求值成
 * 一个固定字符串 —— 之后每个请求的 x-s-common 都带同一个时间戳，签名不再随时间滚动。
 *
 * ## 为什么不调 `forUserAgent()`
 *
 * 上游 v1.2.0 新增的 `forUserAgent(ua)` 按 UA 派生 `s0` / `x2` / `DATA_PLATFORM` /
 * `PUBLIC_USERAGENT`，看着正合适 —— 但**无 UA 时它会退回 `'PC'`**，而本函数是模块级
 * 单例用的、拿不到调用方的 UA；真实浏览器发的是 `"Windows"`。保持库默认的 Windows
 * 那组反而正确。要真按平台派生，得先把 UA 从 client 串到这里，那是另一件事。
 */
export const createXiaohongshuCryptoConfig = (): CryptoConfig =>
  new CryptoConfig().withOverrides({
    DATA_WEB_BUILD: WEB_BUILD,
    DATA_SDK_VERSION: SDK_VERSION
  })
