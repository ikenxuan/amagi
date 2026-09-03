/**
 * Amagi 数据获取器统一导出（阶段 6 起全部从 v7 registry 派生）。
 *
 * 四平台的 `XxxFetcher`（静态，三参签名）与 `createBoundXxxFetcher`
 * （Proxy 绑定形态）都来自各自平台的端点注册表，不再经过 v6 的
 * 手写方法函数层（各平台的 api.ts → internal → getdata）。
 * @module fetchers
 */

// ============================================================================
// B站
// ============================================================================
export type { BilibiliFetcher, BoundBilibiliFetcher, SuccessBilibiliFetcher } from './bilibili'
export { bilibiliFetcher, createBoundBilibiliFetcher } from './bilibili'

// ============================================================================
// 抖音
// ============================================================================
export type { BoundDouyinFetcher, DouyinFetcher, DouyinStaticFetcher, SuccessDouyinFetcher } from './douyin'
export { createBoundDouyinFetcher, douyinFetcher } from './douyin'
// 4 个 passport 方法（@deprecated，v6 实现保留）：顶层保留导出经由这里上浮
export {
  checkPassportQrcode,
  requestPassportQrcode,
  sendPassportVerifyCode,
  validatePassportVerifyCode
} from './douyin'

// ============================================================================
// 快手
// ============================================================================
export type { BoundKuaishouFetcher, KuaishouFetcher, SuccessKuaishouFetcher } from './kuaishou'
export { createBoundKuaishouFetcher, kuaishouFetcher } from './kuaishou'

// ============================================================================
// 小红书
// ============================================================================
export type { BoundXiaohongshuFetcher, SuccessXiaohongshuFetcher, XiaohongshuFetcher } from './xiaohongshu'
export { createBoundXiaohongshuFetcher, xiaohongshuFetcher } from './xiaohongshu'
