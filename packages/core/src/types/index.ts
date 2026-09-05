import zod from 'zod'

import type { BilibiliMethodType } from '../validation/bilibili'
import type { DouyinMethodType, DouyinValidationSchemas } from '../validation/douyin'
import type { KuaishouMethodType } from '../validation/kuaishou'
import type { XiaohongshuMethodType } from '../validation/xiaohongshu'
import type { BilibiliMethodOptMap } from './BilibiliAPIParams'
import type { DouyinMethodOptMap } from './DouyinAPIParams'
import type { KuaishouMethodOptMap } from './KuaishouAPIParams'
import type { ErrorDetail, NetworksConfigType } from './NetworksConfigType'
import type { BilibiliReturnTypeMap } from './ReturnDataType/Bilibili'
import type { DouyinReturnTypeMap } from './ReturnDataType/Douyin'
import type { KuaishouReturnTypeMap } from './ReturnDataType/Kuaishou'
import type { XiaohongshuReturnTypeMap } from './ReturnDataType/Xiaohongshu'
import type { XiaohongshuMethodOptMap } from './XiaohongshuAPIParams'

/**
 * 移除methodType字段的工具类型
 */
export type OmitMethodType<T> = Omit<T, 'methodType'>

export type DouyinDataOptionsMap = {
  [K in DouyinMethodType]: {
    opt: DouyinMethodOptMap[K]
    data: DouyinReturnTypeMap[K]
  }
}

export type BilibiliDataOptionsMap = {
  [K in BilibiliMethodType]: {
    opt: BilibiliMethodOptMap[K]
    data: BilibiliReturnTypeMap[K]
  }
}

export type KuaishouDataOptionsMap = {
  [K in KuaishouMethodType]: {
    opt: KuaishouMethodOptMap[K]
    data: KuaishouReturnTypeMap[K]
  }
}

export type XiaohongshuDataOptionsMap = {
  [K in XiaohongshuMethodType]: {
    opt: XiaohongshuMethodOptMap[K]
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

// 导出返回数据类型
export * from './BilibiliAPIParams'
export * from './DouyinAPIParams'
export * from './KuaishouAPIParams'
export * from './ReturnDataType'
export * from './XiaohongshuAPIParams'

// 导出平台数据选项类型
export type XiaohongshuDataOptions<T extends keyof XiaohongshuDataOptionsMap> = OmitMethodType<XiaohongshuDataOptionsMap[T]['opt']>
export type DouyinDataOptions<T extends DouyinMethodType> = OmitMethodType<zod.infer<(typeof DouyinValidationSchemas)[T]>>
export type BilibiliDataOptions<T extends keyof BilibiliDataOptionsMap> = OmitMethodType<BilibiliDataOptionsMap[T]['opt']>
export type KuaishouDataOptions<T extends keyof KuaishouDataOptionsMap> = OmitMethodType<KuaishouDataOptionsMap[T]['opt']>

/**
 * API请求错误类型
 * 该类型是方法 `getXXXData` 封装后请求遇到错误时的返回类型
 */
export type APIErrorType = {
  /** 错误码（v6 的 5 个 APIErrorCode 枚举在 6.2 删除：字符串枚举比数字码恒假、
   *  混合枚举泄漏反向映射。替代物是 `AmagiErrorCode` 联合 + `error.platform.code`） */
  code: number | string
  /** 错误时的响应数据 */
  data: any
  /** amagi 错误详情 */
  amagiError: ErrorDetail
  /** 错误信息 */
  amagiMessage: string
}
