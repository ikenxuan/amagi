import type { BilibiliDataOptionsMap, BilibiliMethodOptionsMap } from './BilibiliAPIParams'
import type { DouyinDataOptionsMap, DouyinMethodOptionsMap } from './DouyinAPIParams'
import type { KuaishouDataOptionsMap } from './KuaishouAPIParams'
import type { NetworksConfigType } from './NetworksConfigType'

/** 定义一个泛型类型 OmitMethodType<T>，从类型 T 中排除 'methodType' 属性 */
export type OmitMethodType<T> = Omit<T, 'methodType'>

// 定义排除 methodType 后的新类型
export type DouyinDataOptions<T extends keyof DouyinDataOptionsMap> = OmitMethodType<DouyinDataOptionsMap[T]['opt'] & TypeControl>
export type BilibiliDataOptions<T extends keyof BilibiliDataOptionsMap> = OmitMethodType<BilibiliDataOptionsMap[T]['opt'] & TypeControl>
export type KuaishouDataOptions<T extends keyof KuaishouDataOptionsMap> = OmitMethodType<KuaishouDataOptionsMap[T]['opt'] & TypeControl>
/** 根据 `typeMode` 定义返回类型 */
export type Fnc<T extends { data: any }, R extends TypeControl['typeMode']> = R extends 'strict' ? T['data'] : any

/**
 * 类型精度控制参数
 */
export type TypeControl = {
  /**
   * 获取返回类型
   * 类型定义时间：2025-02-02
   * 
   * 类型解析模式：
   * - `strict`: 返回严格类型（基于接口响应定义，随时间推移可能缺少未声明的字段）
   * - `loose` 或 `未指定`: 返回宽松的 any 类型（默认）
   * 
   * @default 'loose'
   * @example
   * ```ts
   * // 严格模式
   * const data = await amagi.getDouyinData('视频作品数据', {
   *   aweme_id: '123',
   *   typeMode: 'strict' // 返回精确的 VideoWork 类型
   * });
   * 
   * // 宽松模式
   * const data = await amagi.getDouyinData('视频作品数据', {
   *   aweme_id: '123' // 返回 any 类型
   * });
   * ```
   */
  typeMode?: 'strict' | 'loose'
}

export {
  BilibiliDataOptionsMap,
  BilibiliMethodOptionsMap,
  DouyinDataOptionsMap,
  DouyinMethodOptionsMap,
  KuaishouDataOptionsMap,
  NetworksConfigType
}
