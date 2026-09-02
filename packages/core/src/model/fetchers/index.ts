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
export type { BilibiliFetcher, BoundBilibiliFetcher } from './bilibili'
export { bilibiliFetcher, createBoundBilibiliFetcher } from './bilibili'

// ============================================================================
// 抖音
// ============================================================================
export type { BoundDouyinFetcher, DouyinFetcher, DouyinStaticFetcher } from './douyin'
export { createBoundDouyinFetcher, douyinFetcher } from './douyin'

// ============================================================================
// 快手
// ============================================================================
export type { BoundKuaishouFetcher, KuaishouFetcher } from './kuaishou'
export { createBoundKuaishouFetcher, kuaishouFetcher } from './kuaishou'

// ============================================================================
// 小红书
// ============================================================================
export type { BoundXiaohongshuFetcher, XiaohongshuFetcher } from './xiaohongshu'
export { createBoundXiaohongshuFetcher, xiaohongshuFetcher } from './xiaohongshu'

// ============================================================================
// 通用类型（v6 残余：TypeMode 等随 6.2 删导出；BaseRequestOptions 暂被
// 保留的 douyin passport 方法引用）
// ============================================================================
export * from './types'
