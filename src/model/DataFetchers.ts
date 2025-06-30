import { DouyinData } from 'amagi/platform/douyin/getdata'
import { fetchBilibili } from 'amagi/platform/bilibili/getdata'
import { KuaishouData } from 'amagi/platform/kuaishou/getdata'
import {
  validateDouyinParams,
  validateBilibiliParams,
  validateKuaishouParams,
  createApiResponse,
  DouyinMethodType,
  BilibiliMethodType,
  KuaishouMethodType,
  ApiResponse
} from 'amagi/validation'
import type {
  DouyinDataOptionsMap,
  BilibiliDataOptionsMap,
  KuaishouDataOptionsMap
} from 'amagi/types'

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

// 扩展选项类型，添加typeMode属性
export type ExtendedDouyinOptions<T extends DouyinMethodType> = Omit<DouyinDataOptionsMap[T]['opt'], 'methodType'> & {
  /** 定义返回类型 */
  typeMode?: TypeMode
}

export type ExtendedBilibiliOptions<T extends BilibiliMethodType> = Omit<BilibiliDataOptionsMap[T]['opt'], 'methodType'> & {
  /** 定义返回类型 */
  typeMode?: TypeMode
}

export type ExtendedKuaishouOptions<T extends KuaishouMethodType> = Omit<KuaishouDataOptionsMap[T]['opt'], 'methodType'> & {
  /** 定义返回类型 */
  typeMode?: TypeMode
}

/**
 * 获取抖音数据的核心方法（推荐用法：第三个参数为cookie）
 * @param methodType - 请求数据类型
 * @param options - 请求参数对象，包含typeMode属性控制返回类型
 * @param cookie - 可选的用户Cookie
 * @returns 根据typeMode返回对应类型的数据
 */
export function getDouyinData<
  T extends DouyinMethodType,
  M extends TypeMode
> (
  methodType: T,
  options?: ExtendedDouyinOptions<T> & { typeMode?: M },
  cookie?: string
): Promise<ApiResponse<ConditionalReturnType<DouyinDataOptionsMap[T]['data'], M>>>

/**
 * 获取抖音数据的核心方法（重载：第二个参数为cookie）
 * @param methodType - 请求数据类型
 * @param cookie - 用户Cookie
 * @param options - 请求参数对象，包含typeMode属性控制返回类型
 * @returns 根据typeMode返回对应类型的数据
 */
export function getDouyinData<
  T extends DouyinMethodType,
  M extends TypeMode
> (
  methodType: T,
  cookie: string,
  options?: ExtendedDouyinOptions<T> & { typeMode?: M }
): Promise<ApiResponse<ConditionalReturnType<DouyinDataOptionsMap[T]['data'], M>>>

/**
 * 获取抖音数据的核心方法实现
 */
export async function getDouyinData<T extends DouyinMethodType, M extends TypeMode> (
  methodType: T,
  optionsOrCookie?: (ExtendedDouyinOptions<T> & { typeMode?: M }) | string,
  cookieOrOptions?: (ExtendedDouyinOptions<T> & { typeMode?: M }) | string
): Promise<ApiResponse<ConditionalReturnType<DouyinDataOptionsMap[T]['data'], M>>> {
  try {
    // 判断参数类型并正确分配
    let options: ExtendedDouyinOptions<T> | undefined
    let cookie: string | undefined

    if (typeof optionsOrCookie === 'string') {
      // 第二个参数是cookie的情况
      cookie = optionsOrCookie
      options = cookieOrOptions as ExtendedDouyinOptions<T> | undefined
    } else {
      // 第二个参数是options的情况（推荐用法）
      options = optionsOrCookie
      cookie = cookieOrOptions as string | undefined
    }

    // 从options中移除typeMode，准备验证参数
    const { typeMode: _, ...validationOptions } = options || {}

    // 使用Zod验证参数
    const validatedParams = validateDouyinParams(methodType, validationOptions)

    // 构造符合原始API期望的参数格式
    const apiParams = {
      ...validatedParams
    } as DouyinDataOptionsMap[T]['opt']

    // 调用原始数据获取方法
    const rawData = await DouyinData(apiParams, cookie)

    // 返回统一格式的响应
    return createApiResponse(rawData, '获取成功', 200)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    throw new Error(`抖音数据获取失败: ${errorMessage}`)
  }
}

/**
 * 获取B站数据的核心方法（推荐用法：第三个参数为cookie）
 * @param methodType - 请求数据类型
 * @param options - 请求参数对象，包含typeMode属性控制返回类型
 * @param cookie - 可选的用户Cookie
 * @returns 根据typeMode返回对应类型的数据
 */
export function getBilibiliData<
  T extends BilibiliMethodType,
  M extends TypeMode
> (
  methodType: T,
  options?: ExtendedBilibiliOptions<T> & { typeMode?: M },
  cookie?: string
): Promise<ApiResponse<ConditionalReturnType<BilibiliDataOptionsMap[T]['data'], M>>>

/**
 * 获取B站数据的核心方法（重载：第二个参数为cookie）
 * @param methodType - 请求数据类型
 * @param cookie - 用户Cookie
 * @param options - 请求参数对象，包含typeMode属性控制返回类型
 * @returns 根据typeMode返回对应类型的数据
 */
export function getBilibiliData<
  T extends BilibiliMethodType,
  M extends TypeMode
> (
  methodType: T,
  cookie: string,
  options?: ExtendedBilibiliOptions<T> & { typeMode?: M }
): Promise<ApiResponse<ConditionalReturnType<BilibiliDataOptionsMap[T]['data'], M>>>

/**
 * 获取B站数据的核心方法实现
 */
export async function getBilibiliData<T extends BilibiliMethodType> (
  methodType: T,
  optionsOrCookie?: ExtendedBilibiliOptions<T> | string,
  cookieOrOptions?: string | ExtendedBilibiliOptions<T>
): Promise<ApiResponse<any>> {
  try {
    // 判断参数类型并正确分配
    let options: ExtendedBilibiliOptions<T> | undefined
    let cookie: string | undefined

    if (typeof optionsOrCookie === 'string') {
      // 第二个参数是cookie的情况
      cookie = optionsOrCookie
      options = cookieOrOptions as ExtendedBilibiliOptions<T> | undefined
    } else {
      // 第二个参数是options的情况（推荐用法）
      options = optionsOrCookie
      cookie = cookieOrOptions as string | undefined
    }

    // 从options中移除typeMode，准备验证参数
    const { typeMode: _, ...validationOptions } = options || {}

    // 使用Zod验证参数
    const validatedParams = validateBilibiliParams(methodType, validationOptions)

    // 构造符合原始API期望的参数格式
    const apiParams = {
      ...validatedParams
    } as BilibiliDataOptionsMap[T]['opt']

    // 调用原始数据获取方法
    const rawData = await fetchBilibili(apiParams, cookie)

    // 返回统一格式的响应
    return createApiResponse(rawData, '获取成功', 200)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    throw new Error(`B站数据获取失败: ${errorMessage}`)
  }
}

/**
 * 获取快手数据的核心方法（推荐用法：第三个参数为cookie）
 * @param methodType - 请求数据类型
 * @param options - 请求参数对象，包含typeMode属性控制返回类型
 * @param cookie - 可选的用户Cookie
 * @returns 根据typeMode返回对应类型的数据
 */
export function getKuaishouData<
  T extends KuaishouMethodType,
  M extends TypeMode
> (
  methodType: T,
  options?: ExtendedKuaishouOptions<T> & { typeMode?: M },
  cookie?: string
): Promise<ApiResponse<ConditionalReturnType<KuaishouDataOptionsMap[T]['data'], M>>>

/**
 * 获取快手数据的核心方法（重载：第二个参数为cookie）
 * @param methodType - 请求数据类型
 * @param cookie - 用户Cookie
 * @param options - 请求参数对象，包含typeMode属性控制返回类型
 * @returns 根据typeMode返回对应类型的数据
 */
export function getKuaishouData<
  T extends KuaishouMethodType,
  M extends TypeMode
> (
  methodType: T,
  cookie: string,
  options?: ExtendedKuaishouOptions<T> & { typeMode?: M }
): Promise<ApiResponse<ConditionalReturnType<KuaishouDataOptionsMap[T]['data'], M>>>

/**
 * 获取快手数据的核心方法实现
 */
export async function getKuaishouData<T extends KuaishouMethodType> (
  methodType: T,
  optionsOrCookie?: ExtendedKuaishouOptions<T> | string,
  cookieOrOptions?: string | ExtendedKuaishouOptions<T>
): Promise<ApiResponse<any>> {
  try {
    // 判断参数类型并正确分配
    let options: ExtendedKuaishouOptions<T> | undefined
    let cookie: string | undefined

    if (typeof optionsOrCookie === 'string') {
      // 第二个参数是cookie的情况
      cookie = optionsOrCookie
      options = cookieOrOptions as ExtendedKuaishouOptions<T> | undefined
    } else {
      // 第二个参数是options的情况（推荐用法）
      options = optionsOrCookie
      cookie = cookieOrOptions as string | undefined
    }

    // 从options中移除typeMode，准备验证参数
    const { typeMode: _, ...validationOptions } = options || {}

    // 使用Zod验证参数
    const validatedParams = validateKuaishouParams(methodType, validationOptions)

    // 构造符合原始API期望的参数格式
    const apiParams = {
      ...validatedParams
    } as KuaishouDataOptionsMap[T]['opt']

    // 调用原始数据获取方法
    const rawData = await KuaishouData(apiParams, cookie)

    // 返回统一格式的响应
    return createApiResponse(rawData, '获取成功', 200)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    throw new Error(`快手数据获取失败: ${errorMessage}`)
  }
}
