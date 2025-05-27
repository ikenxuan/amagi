import type { BilibiliDataOptionsMap, BilibiliMethodOptionsMap } from './BilibiliAPIParams'
import type { DouyinDataOptionsMap, DouyinMethodOptionsMap } from './DouyinAPIParams'
import type { KuaishouDataOptionsMap, KuaishouMethodOptionsMap } from './KuaishouAPIParams'
import type { amagiAPIErrorCode, bilibiliAPIErrorCode, douoyinAPIErrorCode, ErrorDetail, kuaishouAPIErrorCode, NetworksConfigType } from './NetworksConfigType'
// 导出返回数据类型
export * from './ReturnDataType'

/** 定义一个泛型类型 OmitMethodType<T>，从类型 T 中排除 'methodType' 属性 */
export type OmitMethodType<T> = Omit<T, 'methodType'>

// 定义排除 methodType 后的新类型
export type DouyinDataOptions<T extends keyof DouyinDataOptionsMap> = OmitMethodType<DouyinDataOptionsMap[T]['opt'] & TypeControl>
export type BilibiliDataOptions<T extends keyof BilibiliDataOptionsMap> = OmitMethodType<BilibiliDataOptionsMap[T]['opt'] & TypeControl>
export type KuaishouDataOptions<T extends keyof KuaishouDataOptionsMap> = OmitMethodType<KuaishouDataOptionsMap[T]['opt'] & TypeControl>

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
   */
  typeMode?: 'strict' | 'loose'
}

export {
  BilibiliDataOptionsMap,
  BilibiliMethodOptionsMap,
  DouyinDataOptionsMap,
  DouyinMethodOptionsMap,
  KuaishouDataOptionsMap,
  KuaishouMethodOptionsMap,
  NetworksConfigType
}

/**
 * API请求错误类型
 * 该类型是方法 `getXXXData` 封装后请求遇到错误时的返回类型
 */
export type APIErrorType<T extends 'douyin' | 'bilibili' | 'kuaishou' | 'default' = 'default'> = {
  /** 错误码 */
  code: T extends 'douyin'
  ? douoyinAPIErrorCode
  : T extends 'bilibili'
  ? bilibiliAPIErrorCode
  : T extends 'kuaishou'
  ? kuaishouAPIErrorCode
  : amagiAPIErrorCode,
  /** 错误时的响应数据 */
  data: any,
  /** amagi 错误详情 */
  amagiError: ErrorDetail,
  /** 错误信息 */
  amagiMessage: string
}