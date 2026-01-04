/* eslint-disable @stylistic/indent */

import zod from 'zod'

import type {
  BilibiliMethodType,
  BilibiliValidationSchemas
} from '../validation/bilibili'
import type {
  DouyinMethodType,
  DouyinValidationSchemas
} from '../validation/douyin'
import type {
  KuaishouMethodType,
  KuaishouValidationSchemas
} from '../validation/kuaishou'
import {
  XiaohongshuMethodType,
  XiaohongshuValidationSchemas
} from '../validation/xiaohongshu'
import type { BilibiliMethodOptMap } from './BilibiliAPIParams'
import type { DouyinMethodOptMap } from './DouyinAPIParams'
import type { KuaishouMethodOptMap } from './KuaishouAPIParams'
import type {
  amagiAPIErrorCode,
  bilibiliAPIErrorCode,
  douoyinAPIErrorCode,
  ErrorDetail,
  kuaishouAPIErrorCode,
  NetworksConfigType,
  xiaohongshuAPIErrorCode
} from './NetworksConfigType'
import type { BilibiliReturnTypeMap } from './ReturnDataType/Bilibili'
import type { DouyinReturnTypeMap } from './ReturnDataType/Douyin'
import type { KuaishouReturnTypeMap } from './ReturnDataType/Kuaishou'
import type { XiaohongshuReturnTypeMap } from './ReturnDataType/Xiaohongshu'
import type { XiaohongshuMethodOptMap } from './XiaohongshuAPIParams'

/**
 * 移除methodType字段的工具类型
 */
export type OmitMethodType<T> = Omit<T, 'methodType'>

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

export type DouyinDataOptionsMap = {
  [K in DouyinMethodType]: {
    opt: DouyinMethodOptMap[K],
    data: DouyinReturnTypeMap[K]
  }
}

export type BilibiliDataOptionsMap = {
  [K in BilibiliMethodType]: {
    opt: BilibiliMethodOptMap[K],
    data: BilibiliReturnTypeMap[K]
  }
}

export type KuaishouDataOptionsMap = {
  [K in KuaishouMethodType]: {
    opt: KuaishouMethodOptMap[K],
    data: KuaishouReturnTypeMap[K]
  }
}

export type XiaohongshuDataOptionsMap = {
  [K in XiaohongshuMethodType]: {
    opt: XiaohongshuMethodOptMap[K],
    data: XiaohongshuReturnTypeMap[K]
  }
}

export type {
  BilibiliMethodType,
  DouyinMethodType,
  KuaishouMethodType,
  // 网络配置类型
  NetworksConfigType
}

// 导出验证模式
export {
  BilibiliValidationSchemas,
  DouyinValidationSchemas,
  KuaishouValidationSchemas,
  XiaohongshuValidationSchemas
}

// 导出返回数据类型
export * from './BilibiliAPIParams'
export * from './DouyinAPIParams'
export * from './KuaishouAPIParams'
export * from './ReturnDataType'
export * from './XiaohongshuAPIParams'

// 导出方法名映射
export * from './method-keys'

// 导出平台数据选项类型
export type XiaohongshuDataOptions<T extends keyof XiaohongshuDataOptionsMap> = OmitMethodType<XiaohongshuDataOptionsMap[T]['opt'] & TypeControl>
export type DouyinDataOptions<T extends DouyinMethodType> = OmitMethodType<zod.infer<(typeof DouyinValidationSchemas)[T]> & TypeControl>
export type BilibiliDataOptions<T extends keyof BilibiliDataOptionsMap> = OmitMethodType<BilibiliDataOptionsMap[T]['opt'] & TypeControl>
export type KuaishouDataOptions<T extends keyof KuaishouDataOptionsMap> = OmitMethodType<KuaishouDataOptionsMap[T]['opt'] & TypeControl>

/**
 * API请求错误类型
 * 该类型是方法 `getXXXData` 封装后请求遇到错误时的返回类型
 */
export type APIErrorType<T extends 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu' | 'default' = 'default'> = {
  /** 错误码 */
  code: T extends 'douyin'
  ? douoyinAPIErrorCode
  : T extends 'bilibili'
  ? bilibiliAPIErrorCode
  : T extends 'kuaishou'
  ? kuaishouAPIErrorCode
  : T extends 'xiaohongshu'
  ? xiaohongshuAPIErrorCode
  : amagiAPIErrorCode,
  /** 错误时的响应数据 */
  data: any,
  /** amagi 错误详情 */
  amagiError: ErrorDetail,
  /** 错误信息 */
  amagiMessage: string
}
