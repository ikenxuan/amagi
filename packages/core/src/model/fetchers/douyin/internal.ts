/**
 * 抖音 Fetcher 内部通用逻辑
 * @module fetchers/douyin/internal
 */

import { emitApiError, emitApiSuccess, emitLogWarn } from 'amagi/model/events'
import { DouyinDataOptionsMap } from 'amagi/types'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { createErrorResponse, createSuccessResponse, Result, validateDouyinParams } from 'amagi/validation'

import { DouyinData } from '../../../platform/douyin/getdata'
import type { FetcherConfig } from '../types'

/**
 * 搜索类型映射 (英文 -> 中文)
 */
export const searchTypeMapping = {
  general: '综合',
  user: '用户',
  video: '视频'
} as const

/** 被风控拦截时的最大重试次数 */
const MAX_ARGUS_RETRIES = 5

/** 触发换参重试的错误码 */
const RETRYABLE_CODES = ['ARGUS_BLOCKED', 'NON_JSON_RESPONSE']

/**
 * 抖音 API 内部调用函数
 * @internal
 * @param methodType - 方法类型
 * @param options - 请求参数
 * @param config - 配置项 (cookie, requestConfig)
 * @returns Promise<Result<T>>
 */
export async function fetchDouyinInternal<T extends keyof DouyinDataOptionsMap>(
  methodType: T,
  options: Omit<DouyinDataOptionsMap[T]['opt'], 'methodType'>,
  config: FetcherConfig
): Promise<Result<DouyinReturnTypeMap[T]>> {
  const startTime = Date.now()
  try {
    const validatedParams = validateDouyinParams(methodType, options)
    const apiParams = { ...validatedParams } as DouyinDataOptionsMap[T]['opt']
    /**
     * 被风控拦下就换一整套请求参数重来。
     *
     * `DouyinData` 每次调用都会重新生成 msToken / verifyFp / a_bogus，而 Argus 是按单次请求的
     * token 组判定、不锁账号，所以换一组即可通过 —— 失败之间互不关联。
     */
    let rawData: any
    let argusRetries = 0
    for (;;) {
      rawData = await DouyinData(apiParams, config.cookie, config.requestConfig)
      if (!RETRYABLE_CODES.includes(rawData?.code) || argusRetries >= MAX_ARGUS_RETRIES) break
      argusRetries++
      emitLogWarn(
        `抖音风控拦截，换一组请求参数重试（${argusRetries}/${MAX_ARGUS_RETRIES}）：`
        + String(rawData.argusBody ?? '').slice(0, 90)
      )
      await new Promise((resolve) => setTimeout(resolve, 400 * argusRetries))
    }
    const duration = Date.now() - startTime

    if (rawData.data === '' || rawData.status_code !== 0) {
      /** 带上真实业务码与文案：原先不传第三个参数，抖音的任何失败都恒为 500 */
      const retriedNote = argusRetries > 0 ? `（已重试 ${argusRetries} 次仍被拦）` : ''
      const argusDetail = rawData.amagiError?.errorDescription
      const failMessage = rawData.status_msg ?? (argusDetail ? argusDetail + retriedNote : '抖音数据获取失败')
      /** 信封的 code 必须是数字，风控那类字符串码只放进事件的 errorCode */
      const failCode = typeof rawData.status_code === 'number' ? rawData.status_code : 500
      emitApiError({
        platform: 'douyin',
        methodType,
        errorCode: rawData.code ?? failCode,
        errorMessage: failMessage,
        url: rawData.amagiError?.requestUrl,
        duration
      })
      return createErrorResponse(rawData.amagiError, failMessage, failCode, rawData)
    }

    const result = createSuccessResponse(rawData, '获取成功', 200)
    emitApiSuccess({ platform: 'douyin', methodType, response: result, statusCode: 200, duration })
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    emitApiError({
      platform: 'douyin',
      methodType,
      errorMessage,
      duration
    })
    throw new Error(`抖音数据获取失败: ${errorMessage}`)
  }
}
