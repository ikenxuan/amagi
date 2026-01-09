/**
 * Amagi v6 数据获取器统一导出
 * @module fetchers
 */

// ============================================================================
// B站
// ============================================================================
export type { BilibiliFetcher, BoundBilibiliFetcher, IBilibiliFetcher, IBoundBilibiliFetcher } from './bilibili'
export { bilibiliFetcher, createBoundBilibiliFetcher } from './bilibili'

// ============================================================================
// 抖音
// ============================================================================
export type { BoundDouyinFetcher, DouyinFetcher, IBoundDouyinFetcher, IDouyinFetcher } from './douyin'
export { createBoundDouyinFetcher, douyinFetcher } from './douyin'

// ============================================================================
// 快手
// ============================================================================
export type { BoundKuaishouFetcher, IBoundKuaishouFetcher, IKuaishouFetcher, KuaishouFetcher } from './kuaishou'
export { createBoundKuaishouFetcher, kuaishouFetcher } from './kuaishou'

// ============================================================================
// 小红书
// ============================================================================
export type { BoundXiaohongshuFetcher, IBoundXiaohongshuFetcher, IXiaohongshuFetcher, XiaohongshuFetcher } from './xiaohongshu'
export { createBoundXiaohongshuFetcher, xiaohongshuFetcher } from './xiaohongshu'

// ============================================================================
// 通用类型
// ============================================================================
export * from './types'
