/**
 * 抖音数据获取模块
 *
 * 提供抖音各类数据的获取功能，包括视频、评论、用户等
 *
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/douyin → DataFetchers
 *
 * @module platform/douyin/getdata
 */

import { fetchData, isNetworkErrorResult, logger } from 'amagi/model'
import { getDouyinDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { DouyinDataOptionsMap } from 'amagi/types'
import { amagiAPIErrorCode, douoyinAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { AxiosRequestConfig } from 'axios'

import { createDouyinApiUrls } from './API'
import { douyinSign } from './sign'

/** 接口 URL 生成器类型定义 */
type ApiUrlGenerator<T> = (params: T) => string

/** 签名算法类型 */
type SignType = 'a_bogus' | 'x_bogus'

/**
 * 获取签名参数
 *
 * @param url - 需要签名的 URL
 * @param signType - 签名算法类型
 * @param userAgent - 用户代理
 * @returns 签名后的参数字符串
 */
const getSignature = (url: string, signType: SignType = 'a_bogus', userAgent: string): string => {
  switch (signType) {
    case 'x_bogus':
      return douyinSign.XB(url, userAgent)
    case 'a_bogus':
    default:
      return douyinSign.AB(url, userAgent)
  }
}

/**
 * 获取签名参数名称
 *
 * @param signType - 签名算法类型
 * @returns 签名参数名称
 */
const getSignParamName = (signType: SignType = 'a_bogus'): string => {
  switch (signType) {
    case 'x_bogus':
      return 'X-Bogus'
    case 'a_bogus':
    default:
      return 'a_bogus'
  }
}

/**
 * 构建带签名的 URL
 *
 * @param url - 基础 URL
 * @param signType - 签名算法类型
 * @param userAgent - 用户代理
 * @returns 带签名的完整 URL
 */
const buildSignedUrl = (url: string, signType: SignType = 'a_bogus', userAgent: string): string => {
  const signature = getSignature(url, signType, userAgent)
  const paramName = getSignParamName(signType)
  return `${url}&${paramName}=${signature}`
}

/**
 * 抖音数据获取函数
 *
 * @param data - 请求数据参数
 * @param cookie - 用户 Cookie
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 返回抖音数据
 */
export const DouyinData = async <T extends keyof DouyinDataOptionsMap> (
  data: DouyinDataOptionsMap[T]['opt'],
  cookie?: string,
  requestConfig?: RequestConfig
) => {
  const defHeaders = getDouyinDefaultConfig(cookie)['headers']

  const baseRequestConfig: AxiosRequestConfig = {
    method: 'GET',
    timeout: 10000,
    ...requestConfig,
    headers: {
      ...defHeaders,
      ...(requestConfig?.headers ?? {})
    }
  }

  const userAgent = baseRequestConfig.headers?.['User-Agent'] as string
  const douyinApiUrls = createDouyinApiUrls(userAgent)
  const signType = (data as any).signType ?? 'a_bogus'

  switch (data.methodType) {
    case 'textWork':
    case 'parseWork':
    case 'videoWork':
    case 'imageAlbumWork':
    case 'slidesWork': {
      const url = douyinApiUrls.getWorkDetail({ aweme_id: data.aweme_id })
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'comments': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['comments']['opt']> = (params) => douyinApiUrls.getComments(params)
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['comments']['opt'], DouyinReturnTypeMap['comments'], DouyinReturnTypeMap['comments']>({
        type: data.methodType,
        apiUrlGenerator: urlGenerator,
        params: { ...data, cursor: data.cursor ?? 0 },
        maxPageSize: 50,
        requestConfig: baseRequestConfig,
        signType,
        extractList: (resp) => resp.comments ?? [],
        updateParams: (params, resp) => ({ ...params, cursor: resp.cursor }),
        hasMore: (resp) => resp.has_more === 1,
        formatFinalResponse: (resp, list) => ({
          ...resp,
          comments: list,
          cursor: resp.cursor ?? list.length
        })
      })
      return response
    }

    case 'commentReplies': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['commentReplies']['opt']> = (params) => douyinApiUrls.getCommentReplies(params)
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['commentReplies']['opt'], DouyinReturnTypeMap['commentReplies'], DouyinReturnTypeMap['commentReplies']>({
        type: data.methodType,
        apiUrlGenerator: urlGenerator,
        params: { ...data, cursor: data.cursor ?? 0 },
        maxPageSize: 3,
        requestConfig: baseRequestConfig,
        signType: 'x_bogus',
        extractList: (resp) => resp.comments ?? [],
        updateParams: (params, resp) => ({ ...params, cursor: resp.cursor }),
        hasMore: (resp) => resp.has_more === 1,
        formatFinalResponse: (resp, list) => ({
          ...resp,
          comments: list,
          cursor: resp.cursor ?? list.length
        })
      })
      return response
    }

    case 'userProfile': {
      const url = douyinApiUrls.getUserProfile({ sec_uid: data.sec_uid })
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...(!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        }
      }
      const result = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'emojiList': {
      const url = douyinApiUrls.getEmojiList()
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url
      })
      return result
    }

    case 'userVideoList': {
      const url = douyinApiUrls.getUserVideoList({ sec_uid: data.sec_uid })
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...(!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        }
      }
      const result = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'suggestWords': {
      const url = douyinApiUrls.getSuggestWords({ query: data.query })
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...(!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          }
        }
      }
      const result = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'search': {
      const searchType = data.type ?? 'general'
      const refererUrl = searchType === 'user'
        ? `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}?type=user`
        : searchType === 'video'
          ? `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}?type=video`
          : `https://www.douyin.com/root/search/${encodeURIComponent(String(data.query))}`

      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...(!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            referer: refererUrl
          }
        }
      }

      const isUserSearch = searchType === 'user'
      const isVideoSearch = searchType === 'video'

      const response = await fetchPaginatedData<any, any, DouyinReturnTypeMap['search'], DouyinReturnTypeMap['search']>({
        type: data.methodType,
        apiUrlGenerator: (params) => douyinApiUrls.search(params),
        params: {
          query: data.query,
          type: data.type,
          number: data.number ?? 10,
          search_id: ''
        },
        maxPageSize: 15,
        requestConfig: customConfig,
        signType: null,
        processRawResponse: (raw) => {
          if (!isUserSearch && !isVideoSearch) {
            const chunks: any[] = typeof raw === 'string'
              ? parseDouyinMultiJson(raw)
              : [raw]
            const responses = filterSearchResponses(chunks)

            if (responses.length === 0) return raw

            const mergedData: any[] = []
            let lastValid: any = {}
            for (const resp of responses) {
              if (Array.isArray(resp.data) && resp.data.length > 0) {
                mergedData.push(...resp.data)
              }
              lastValid = resp
            }
            return { ...lastValid, data: mergedData }
          }
          return raw
        },
        extractList: (resp) => {
          if (isUserSearch) {
            const userResp = resp as unknown as { user_list: any[] }
            return userResp.user_list ?? []
          }
          const videoResp = resp as unknown as { data: any[] }
          return videoResp.data ?? []
        },
        updateParams: (params, resp) => {
          let nextSearchId = params.search_id
          if (isUserSearch) {
            const userResp = resp as unknown as { rid: string }
            nextSearchId = userResp.rid ?? nextSearchId
          } else {
            const videoResp = resp as unknown as { log_pb: { impr_id: string } }
            nextSearchId = videoResp.log_pb?.impr_id ?? nextSearchId
          }
          return { ...params, search_id: nextSearchId }
        },
        hasMore: (resp) => {
          const hasMoreResp = resp as unknown as { has_more: number }
          return hasMoreResp.has_more !== 0
        },
        validateFirstPage: (list, raw, url) => {
          const typeStr = isUserSearch ? '用户' : isVideoSearch ? '视频' : '综合'
          let isInvalidResponse = false

          const rawAny = raw

          if (!rawAny || typeof rawAny !== 'object') {
            isInvalidResponse = true
          } else {
            if (isUserSearch && !rawAny.user_list) isInvalidResponse = true
            else if (isVideoSearch && !rawAny.data) isInvalidResponse = true
            else if (!isUserSearch && !isVideoSearch && !rawAny.data) isInvalidResponse = true
          }

          if (isInvalidResponse) {
            const desc = `抖音${typeStr}搜索返回无有效数据，疑似触发反爬机制，你的抖音Cookie可能已经失效！`
            const warningMessage = `
            获取响应数据失败！原因：${logger.yellow(`${typeStr}搜索返回无有效数据，疑似触发反爬机制`)}
            请求类型：「${data.methodType}」
            搜索关键词：「${data.query}」
            请求URL：${url}
            `
            return {
              code: douoyinAPIErrorCode.COOKIE,
              data: raw,
              amagiError: {
                errorDescription: desc,
                requestType: data.methodType ?? '未知请求类型',
                requestUrl: url
              },
              amagiMessage: warningMessage
            }
          }

          if (!list || list.length === 0) {
            const desc = `抖音${typeStr}搜索接口第一次请求就返回空数组，可能该关键词无搜索结果或触发风控限制，你的抖音Cookie可能已经失效！`
            const warningMessage = `
            获取响应数据失败！原因：${logger.yellow(`${typeStr}搜索接口第一次请求就返回空数组，你的抖音Cookie可能已经失效！`)}
            请求类型：「${data.methodType}」
            搜索关键词：「${data.query}」
            请求URL：${url}
            `
            logger.warn(warningMessage)
            return {
              data: raw,
              amagiError: {
                errorDescription: desc,
                requestType: data.methodType ?? '未知请求类型',
                requestUrl: url
              },
              amagiMessage: warningMessage
            }
          }
          return null
        },
        formatFinalResponse: (resp, list) => {
          if (isUserSearch) return { ...resp, user_list: list }
          return { ...resp, data: list }
        }
      })

      return response
    }

    case 'dynamicEmojiList': {
      const url = douyinApiUrls.getDynamicEmojiList()
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'musicInfo': {
      const url = douyinApiUrls.getMusicInfo({ music_id: data.music_id })
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'liveRoomInfo': {
      let url = douyinApiUrls.getLiveRoomInfo({ room_id: data.room_id, web_rid: data.web_rid })
      const liveCustomConfig = {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent),
        headers: {
          ...baseRequestConfig.headers,
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://live.douyin.com/${data.web_rid}`
          })
        }
      }

      const result = await GlobalGetData(data.methodType, {
        ...liveCustomConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'loginQrcode': {
      const url = douyinApiUrls.getLoginQrcode({ verify_fp: data.verify_fp })
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'danmakuList': {
      const MAX_SEGMENT_DURATION = 32000

      const startTime = data.start_time ?? 0
      const endTime = data.end_time ?? data.duration
      const totalDuration = endTime - startTime

      if (totalDuration <= MAX_SEGMENT_DURATION) {
        const url = douyinApiUrls.getDanmakuList({
          aweme_id: data.aweme_id,
          start_time: startTime,
          end_time: endTime,
          duration: data.duration
        })
        const result = await GlobalGetData(data.methodType, {
          ...baseRequestConfig,
          url: buildSignedUrl(url, signType, userAgent)
        })
        return result
      }

      const segments: Array<{ start: number, end: number }> = []
      let currentStart = startTime

      while (currentStart < endTime) {
        const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, endTime)
        segments.push({ start: currentStart, end: currentEnd })
        currentStart = currentEnd
      }

      logger.debug(`弹幕数据需要分${segments.length}段获取，总时长：${totalDuration}ms`)

      const segmentPromises = segments.map(async (segment, index) => {
        const url = douyinApiUrls.getDanmakuList({
          aweme_id: data.aweme_id,
          start_time: segment.start,
          end_time: segment.end,
          duration: data.duration
        })

        try {
          const segmentData = await GlobalGetData(`${data.methodType}-segment${index + 1}`, {
            ...baseRequestConfig,
            url: buildSignedUrl(url, signType, userAgent)
          })

          logger.debug(`弹幕第${index + 1}段获取成功 (${segment.start}ms-${segment.end}ms)`)
          return segmentData
        } catch (error) {
          logger.debug(`弹幕第${index + 1}段获取失败 (${segment.start}ms-${segment.end}ms):`, error)
          return null
        }
      })

      const segmentResults = await Promise.all(segmentPromises)

      const mergedDanmakuList: any[] = []
      let finalExtra: any = null
      let finalLogPb: any = null
      let finalStatusCode = 0

      segmentResults.forEach((segmentData, index) => {
        if (segmentData && segmentData.danmaku_list) {
          mergedDanmakuList.push(...segmentData.danmaku_list)

          if (index === 0) {
            finalExtra = segmentData.extra
            finalLogPb = segmentData.log_pb
            finalStatusCode = segmentData.status_code
          }
        }
      })

      mergedDanmakuList.sort((a, b) => (a.offset_time ?? 0) - (b.offset_time ?? 0))

      const finalDanmakuData = {
        danmaku_list: mergedDanmakuList,
        start_time: startTime,
        end_time: endTime,
        total: mergedDanmakuList.length,
        status_code: finalStatusCode,
        extra: finalExtra,
        log_pb: finalLogPb
      }

      logger.debug(`弹幕数据合并完成，共获取${mergedDanmakuList.length}条弹幕`)
      return finalDanmakuData
    }

    default: {
      const customUrl = (data as any).custom_url
      if (typeof customUrl === 'string' && customUrl.length > 0) {
        const url = buildSignedUrl(customUrl, signType, userAgent)
        const resp = await GlobalGetData((data as any).methodType ?? 'customRequest', {
          ...baseRequestConfig,
          url
        })
        return resp
      }
      logger.warn(`未知的抖音数据接口：「${logger.red((data as any).methodType)}」`)
      return null
    }
  }
}

/**
 * 通用分页请求配置接口
 */
interface PaginationConfig<T, P, R, RawResp = any> {
  type: string
  apiUrlGenerator: (params: P) => string
  params: P
  maxPageSize: number
  requestConfig: AxiosRequestConfig
  signType?: SignType | null
  extractList: (response: RawResp) => T[]
  updateParams: (currentParams: P, lastResponse: RawResp) => P
  hasMore: (lastResponse: RawResp) => boolean
  formatFinalResponse: (lastResponse: RawResp, allData: T[]) => R
  processRawResponse?: (raw: any) => RawResp
  validateFirstPage?: (data: T[], response: RawResp, url: string) => any | null
}

/**
 * 通用的分页请求函数
 */
const fetchPaginatedData = async <T, P, R, RawResp = any> (
  config: PaginationConfig<T, P, R, RawResp>
): Promise<R> => {
  const {
    type,
    apiUrlGenerator,
    params,
    maxPageSize,
    requestConfig,
    signType = 'a_bogus',
    extractList,
    updateParams,
    hasMore,
    formatFinalResponse,
    processRawResponse,
    validateFirstPage
  } = config

  let currentParams = { ...params }
  const fetchedData: T[] = []
  let lastResponse: any = {}
  let isFirstRequest = true
  const userAgent = requestConfig.headers?.['User-Agent'] as string

  const targetNumber = Number((params as any).number ?? maxPageSize)

  while (fetchedData.length < targetNumber) {
    const currentCount = fetchedData.length
    const remaining = targetNumber - currentCount
    const requestCount = Math.min(remaining, maxPageSize)

    ;(currentParams as any).number = requestCount

    const url = apiUrlGenerator(currentParams)
    const finalUrl = signType ? buildSignedUrl(url, signType, userAgent) : url

    const raw = await GlobalGetData(type, {
      ...requestConfig,
      url: finalUrl
    })

    const response = processRawResponse ? processRawResponse(raw) : raw

    if (response && response.amagiError) {
      return response
    }

    const list = extractList(response)

    if (isFirstRequest && validateFirstPage) {
      const error = validateFirstPage(list, response, finalUrl)
      if (error) return error
    }

    if (Array.isArray(list) && list.length > 0) {
      fetchedData.push(...list)
    }

    lastResponse = response

    if (!hasMore(response)) {
      break
    }

    if (!list || list.length === 0) {
      break
    }

    currentParams = updateParams(currentParams, response)
    isFirstRequest = false
  }

  const slicedData = targetNumber === 0 ? [] : fetchedData.slice(0, targetNumber)

  return formatFinalResponse(lastResponse, slicedData)
}

/**
 * 全局数据获取函数
 */
const GlobalGetData = async (type: string, config: AxiosRequestConfig): Promise<any | ErrorDetail> => {
  let warningMessage = ''
  try {
    const result = await fetchData(config)

    if (isNetworkErrorResult(result)) {
      const networkError = new Error(result.error.amagiError.errorDescription)
      Object.assign(networkError, {
        code: result.error.code,
        data: null,
        amagiError: { ...result.error.amagiError, requestType: type }
      })
      throw networkError
    }

    if (!result || result === '') {
      const Err: ErrorDetail = {
        errorDescription: '获取响应数据失败！接口返回内容为空，你的抖音ck可能已经失效！',
        requestType: type ?? '未知请求类型',
        requestUrl: config.url!
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow('接口返回内容为空，你的抖音ck可能已经失效！')}
      请求类型：「${type}」
      请求URL：${config.url}
      `
      logger.warn(warningMessage)
      const cookieError = new Error(Err.errorDescription)
      Object.assign(cookieError, {
        code: douoyinAPIErrorCode.COOKIE,
        data: result,
        amagiError: Err
      })
      throw cookieError
    }

    if (result.filter_detail && result.filter_detail.filter_reason) {
      const filterReason = result.filter_detail.filter_reason
      const Err: ErrorDetail = {
        errorDescription: `获取响应数据失败！原因：${filterReason}！`,
        requestType: type ?? '未知请求类型',
        requestUrl: config.url!
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow(filterReason)}
      请求类型：「${type}」
      请求URL：${config.url}
      `
      logger.warn(warningMessage)
      const filterError = new Error(Err.errorDescription)
      Object.assign(filterError, {
        code: douoyinAPIErrorCode.FILTER,
        data: result,
        amagiError: Err
      })
      throw filterError
    }
    return result
  } catch (error) {
    if (error && typeof error === 'object') {
      const err = error as ErrorDetail
      return { ...err, amagiMessage: warningMessage }
    }
    return {
      code: amagiAPIErrorCode.UNKNOWN,
      data: null,
      amagiError: {
        errorDescription: '未知错误',
        requestType: type,
        requestUrl: config.url
      },
      amagiMessage: warningMessage
    }
  }
}

/** 解析抖音反爬的 multi-JSON 响应 */
const parseDouyinMultiJson = (raw: string): any[] => {
  const blocks: string[] = []
  let depth = 0
  let start = -1

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]

    if (c === '{') {
      if (depth === 0) start = i
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        blocks.push(raw.slice(start, i + 1))
        start = -1
      }
    }
  }

  const parsed = []
  for (const block of blocks) {
    try {
      parsed.push(JSON.parse(block))
    } catch { }
  }
  return parsed
}

/** 只保留包含 cursor/has_more/data 的合法搜索响应 */
const filterSearchResponses = (objs: any[]): any[] => {
  return objs.filter(o =>
    o &&
    typeof o.cursor === 'number' &&
    typeof o.has_more === 'number' &&
    Array.isArray(o.data)
  )
}
