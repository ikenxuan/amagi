// 导入所有平台的类型定义
import type { DouyinDataOptionsMap, DouyinMethodOptionsMap } from './DouyinAPIParams'
import type { BilibiliDataOptionsMap, BilibiliMethodOptionsMap } from './BilibiliAPIParams'
import type { KuaishouDataOptionsMap, KuaishouMethodOptionsMap } from './KuaishouAPIParams'
import type { NetworksConfigType } from './NetworksConfigType'

/**
 * 移除methodType字段的工具类型
 */
export type OmitMethodType<T> = Omit<T, 'methodType'>

/**
 * 类型控制接口
 */
export interface TypeControl {
  typeMode?: 'strict' | 'loose'
}

// 导出所有平台的类型
export type {
  // 抖音相关类型
  DouyinDataOptionsMap,
  DouyinMethodOptionsMap,
  
  // B站相关类型
  BilibiliDataOptionsMap,
  BilibiliMethodOptionsMap,
  
  // 快手相关类型
  KuaishouDataOptionsMap,
  KuaishouMethodOptionsMap,
  
  // 网络配置类型
  NetworksConfigType
}

// 导出返回数据类型
export * from './ReturnDataType'

// 导出平台数据选项类型
export type DouyinDataOptions<T extends keyof DouyinDataOptionsMap> = OmitMethodType<DouyinDataOptionsMap[T]['opt'] & TypeControl>
export type BilibiliDataOptions<T extends keyof BilibiliDataOptionsMap> = OmitMethodType<BilibiliDataOptionsMap[T]['opt'] & TypeControl>
export type KuaishouDataOptions<T extends keyof KuaishouDataOptionsMap> = OmitMethodType<KuaishouDataOptionsMap[T]['opt'] & TypeControl>