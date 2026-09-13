/**
 * Amagi 数据获取器统一导出。
 *
 * 四平台的 `XxxFetcher`（静态，三参签名）与 `createBoundXxxFetcher`
 * （Proxy 绑定形态）都从各自平台的端点注册表派生。
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
// 4 个 passport 方法（@deprecated）：顶层导出经由这里上浮
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
