/**
 * Amagi v6 数据获取器类型定义
 * @module fetchers/types
 */

import type { RequestConfig } from 'amagi/server'

// ============================================================================
// 通用类型定义
// ============================================================================

/**
 * 类型精度模式
 * - strict: 严格类型，基于接口响应定义
 * - loose: 宽松类型，返回 any
 */
export type TypeMode = 'strict' | 'loose'

/** 条件返回类型 */
export type ConditionalReturnType<T, M extends TypeMode> = M extends 'strict' ? T : any

/**
 * 从 Options 中提取 TypeMode
 * 用于从 options.typeMode 推断返回类型
 */
export type ExtractTypeMode<T> = T extends { typeMode: infer M extends TypeMode } ? M : 'loose'

/** 基础请求选项 */
export interface BaseRequestOptions {
  /** 类型精度模式: 'strict' 返回严格类型 */
  typeMode?: TypeMode
}

/** 数据获取器配置 */
export interface FetcherConfig {
  /** Cookie */
  cookie?: string
  /** 请求配置 */
  requestConfig?: RequestConfig
}
