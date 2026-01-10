/**
 * 数据获取器模块 (已废弃)
 *
 * 此模块中的 getXXXData 函数已在 v6 版本废弃并移除
 * 请使用新的 fetcher API 替代
 *
 * @module model/DataFetchers
 * @deprecated v6 已废弃，请使用 fetcher API 替代
 */

import { checkDeprecation } from 'amagi/utils/deprecation'

// ============================================================================
// 类型导出 (保留类型定义供其他模块使用)
// ============================================================================

/**
 * 获取返回类型
 * 类型定义时间：2025-02-02
 *
 * 类型解析模式：
 * - `strict`: 返回严格类型（基于接口响应定义，随时间推移可能缺少未声明的字段）
 * - `loose` 或 `未指定`: 返回宽松的 any 类型（默认）
 *
 * @default 'loose'
 */
export type TypeMode = 'strict' | 'loose'

/** 条件类型：根据TypeMode决定返回类型 */
export type ConditionalReturnType<T, M extends TypeMode> = M extends 'strict' ? T : any

// ============================================================================
// 废弃的 API 存根函数
// ============================================================================

/**
 * 获取抖音数据
 *
 * @deprecated v6 已废弃，请使用 douyinFetcher 或 client.douyin.fetcher 替代
 * @throws {DeprecatedApiError} 调用时抛出废弃错误
 *
 * @example
 * ```typescript
 * // 旧用法 (已废弃，会抛出错误)
 * const data = await getDouyinData('videoWork', { aweme_id: '123' }, cookie)
 *
 * // 新用法
 * import { douyinFetcher } from '@ikenxuan/amagi'
 * const data = await douyinFetcher.fetchVideoWork({ aweme_id: '123' }, cookie)
 *
 * // 或使用客户端实例
 * const client = createAmagiClient({ cookies: { douyin: cookie } })
 * const data = await client.douyin.fetcher.fetchVideoWork({ aweme_id: '123' })
 * ```
 */
export function getDouyinData (..._args: any[]): never {
  checkDeprecation('getDouyinData')
  // checkDeprecation 会抛出错误，这里不会执行
  throw new Error('getDouyinData 已废弃')
}

/**
 * 获取B站数据
 *
 * @deprecated v6 已废弃，请使用 bilibiliFetcher 或 client.bilibili.fetcher 替代
 * @throws {DeprecatedApiError} 调用时抛出废弃错误
 *
 * @example
 * ```typescript
 * // 旧用法 (已废弃，会抛出错误)
 * const data = await getBilibiliData('videoInfo', { bvid: 'BV123' }, cookie)
 *
 * // 新用法
 * import { bilibiliFetcher } from '@ikenxuan/amagi'
 * const data = await bilibiliFetcher.fetchVideoInfo({ bvid: 'BV123' }, cookie)
 *
 * // 或使用客户端实例
 * const client = createAmagiClient({ cookies: { bilibili: cookie } })
 * const data = await client.bilibili.fetcher.fetchVideoInfo({ bvid: 'BV123' })
 * ```
 */
export function getBilibiliData (..._args: any[]): never {
  checkDeprecation('getBilibiliData')
  throw new Error('getBilibiliData 已废弃')
}

/**
 * 获取快手数据
 *
 * @deprecated v6 已废弃，请使用 kuaishouFetcher 或 client.kuaishou.fetcher 替代
 * @throws {DeprecatedApiError} 调用时抛出废弃错误
 *
 * @example
 * ```typescript
 * // 旧用法 (已废弃，会抛出错误)
 * const data = await getKuaishouData('videoWork', { photoId: '123' }, cookie)
 *
 * // 新用法
 * import { kuaishouFetcher } from '@ikenxuan/amagi'
 * const data = await kuaishouFetcher.fetchVideoWork({ photoId: '123' }, cookie)
 *
 * // 或使用客户端实例
 * const client = createAmagiClient({ cookies: { kuaishou: cookie } })
 * const data = await client.kuaishou.fetcher.fetchVideoWork({ photoId: '123' })
 * ```
 */
export function getKuaishouData (..._args: any[]): never {
  checkDeprecation('getKuaishouData')
  throw new Error('getKuaishouData 已废弃')
}

/**
 * 获取小红书数据
 *
 * @deprecated v6 已废弃，请使用 xiaohongshuFetcher 或 client.xiaohongshu.fetcher 替代
 * @throws {DeprecatedApiError} 调用时抛出废弃错误
 *
 * @example
 * ```typescript
 * // 旧用法 (已废弃，会抛出错误)
 * const data = await getXiaohongshuData('noteDetail', { note_id: '123' }, cookie)
 *
 * // 新用法
 * import { xiaohongshuFetcher } from '@ikenxuan/amagi'
 * const data = await xiaohongshuFetcher.fetchNoteDetail({ note_id: '123' }, cookie)
 *
 * // 或使用客户端实例
 * const client = createAmagiClient({ cookies: { xiaohongshu: cookie } })
 * const data = await client.xiaohongshu.fetcher.fetchNoteDetail({ note_id: '123' })
 * ```
 */
export function getXiaohongshuData (..._args: any[]): never {
  checkDeprecation('getXiaohongshuData')
  throw new Error('getXiaohongshuData 已废弃')
}
