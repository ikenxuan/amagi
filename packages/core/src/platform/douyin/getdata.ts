/**
 * 抖音数据获取模块
 *
 * 提供抖音各类数据的获取功能，包括视频、评论、用户等
 *
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 *
 * @module platform/douyin/getdata
 */

import { emitLogDebug, emitLogWarn, fetchResponse, isNetworkErrorResult } from 'amagi/model'
import { getDouyinDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { DouyinDataOptionsMap } from 'amagi/types'
import { amagiAPIErrorCode, douoyinAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { AxiosRequestConfig } from 'axios'

import { createDouyinApiUrls } from './API'
import { douyinSign } from './sign'
import { extractUifidFromCookie } from './sign/secsdkWebSign'
import { rememberDouyinWebid, withDouyinWebid } from './webid'

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
const buildSignedUrlBase = (url: string, signType: SignType = 'a_bogus', userAgent: string): string => {
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
export const DouyinData = async <T extends keyof DouyinDataOptionsMap>(
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
  /**
   * 遮蔽外层的 `buildSignedUrlBase`，让下面所有调用点自动补上 webid 与 secsdk 签名。
   *
   * 顺序固定为 webid → a_bogus → secsdk：三者都覆盖 query，颠倒任意一步签名都不成立。
   * path 不在 SDK 策略表内时 `SecSdk` 原样返回，因此对其余接口是无操作。
   */
  const secsdkUifid = extractUifidFromCookie(baseRequestConfig.headers?.Cookie as string | undefined)
  const buildSignedUrl = (url: string, st: SignType = signType, ua: string = userAgent): string =>
    douyinSign.SecSdk(buildSignedUrlBase(withDouyinWebid(url, baseRequestConfig.headers?.Cookie as string | undefined), st, ua), {
      uifid: secsdkUifid,
      method: baseRequestConfig.method
    })

  /** iesdouyin v2 游客端点专用：不签名、不带 cookie（带上只会多一层与会话的交叉校验） */
  const guestConfig = (url: string): AxiosRequestConfig => {
    const headers = { ...baseRequestConfig.headers } as Record<string, any>
    delete headers.Cookie
    return { ...baseRequestConfig, headers, url }
  }

  switch (data.methodType) {
    case 'textWork':
    case 'parseWork':
    case 'videoWork':
    case 'imageAlbumWork':
    case 'slidesWork': {
      /**
       * 走 www-hj 边缘 + 视频页自带的两个参数：www.douyin.com 上该接口实测 9/18 被 Argus 拦，
       * 换成 www-hj 后 18/18 通过。只是降低拦截率而非消除，重试仍需保留。
       */
      const url = douyinApiUrls.getWorkDetail({ aweme_id: data.aweme_id })
        .replace('//www.douyin.com', '//www-hj.douyin.com') + '&request_source=600&origin_type=video_page'
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return result
    }

    case 'comments': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['comments']['opt']> = (params) => douyinApiUrls.getComments(params)
      const response = await fetchPaginatedData<
        any,
        DouyinDataOptionsMap['comments']['opt'],
        DouyinReturnTypeMap['comments'],
        DouyinReturnTypeMap['comments']
      >({
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
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['commentReplies']['opt']> = (params) =>
        douyinApiUrls.getCommentReplies(params)
      const response = await fetchPaginatedData<
        any,
        DouyinDataOptionsMap['commentReplies']['opt'],
        DouyinReturnTypeMap['commentReplies'],
        DouyinReturnTypeMap['commentReplies']
      >({
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
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          })
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
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['userVideoList']['opt']> = (params) => douyinApiUrls.getUserVideoList(params)
      const response = await fetchPaginatedData({
        type: data.methodType,
        apiUrlGenerator: urlGenerator,
        params: { ...data, max_cursor: data.max_cursor },
        maxPageSize: 18,
        requestConfig: {
          ...baseRequestConfig,
          headers: {
            ...baseRequestConfig.headers,
            ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
              Referer: `https://www.douyin.com/user/${data.sec_uid}`
            })
          }
        },
        signType,
        extractList: (resp) => resp.aweme_list ?? [],
        updateParams: (params, resp) => ({
          ...params,
          max_cursor: resp.max_cursor?.toString() ?? '0'
        }),
        hasMore: (resp) => resp.has_more === 1,
        formatFinalResponse: (resp, list) => ({
          ...resp,
          aweme_list: list
        })
      })
      return response
    }

    case 'userFavoriteList': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['userFavoriteList']['opt']> = (params) =>
        douyinApiUrls.getUserFavoriteList(params)
      const response = await fetchPaginatedData({
        type: data.methodType,
        apiUrlGenerator: urlGenerator,
        params: { ...data, max_cursor: data.max_cursor },
        maxPageSize: 18,
        requestConfig: {
          ...baseRequestConfig,
          headers: {
            ...baseRequestConfig.headers,
            ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
              Referer: `https://www.douyin.com/user/${data.sec_uid}`
            })
          }
        },
        signType,
        extractList: (resp) => resp.aweme_list ?? [],
        updateParams: (params, resp) => ({
          ...params,
          max_cursor: resp.max_cursor?.toString() ?? '0'
        }),
        hasMore: (resp) => resp.has_more === 1,
        formatFinalResponse: (resp, list) => ({
          ...resp,
          aweme_list: list
        })
      })
      return response
    }

    case 'userRecommendList': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['userRecommendList']['opt']> = (params) =>
        douyinApiUrls.getUserRecommendList(params)
      const response = await fetchPaginatedData({
        type: data.methodType,
        apiUrlGenerator: urlGenerator,
        params: { ...data, max_cursor: data.max_cursor },
        maxPageSize: 18,
        requestConfig: {
          ...baseRequestConfig,
          headers: {
            ...baseRequestConfig.headers,
            ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
              Referer: `https://www.douyin.com/user/${data.sec_uid}`
            })
          }
        },
        signType,
        extractList: (resp) => resp.aweme_list ?? [],
        updateParams: (params, resp) => ({
          ...params,
          max_cursor: resp.max_cursor?.toString() ?? '0'
        }),
        hasMore: (resp) => resp.has_more === true,
        formatFinalResponse: (resp, list) => ({
          ...resp,
          aweme_list: list
        })
      })
      return response
    }

    case 'suggestWords': {
      const url = douyinApiUrls.getSuggestWords({ query: data.query })
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          })
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
      const refererUrl =
        searchType === 'user'
          ? `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}?type=user`
          : searchType === 'video'
            ? `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}?type=video`
            : `https://www.douyin.com/root/search/${encodeURIComponent(String(data.query))}`

      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            referer: refererUrl
          })
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
            const chunks: any[] = typeof raw === 'string' ? parseDouyinMultiJson(raw) : [raw]
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
            获取响应数据失败！原因：${typeStr}搜索返回无有效数据，疑似触发反爬机制
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
            获取响应数据失败！原因：${typeStr}搜索接口第一次请求就返回空数组，你的抖音Cookie可能已经失效！
            请求类型：「${data.methodType}」
            搜索关键词：「${data.query}」
            请求URL：${url}
            `
            emitLogWarn(warningMessage)
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

    case 'guestUserInfo':
      return await GlobalGetData(data.methodType, guestConfig(
        douyinApiUrls.getGuestUserInfo({ unique_id: data.unique_id })
      ))

    case 'guestMusicInfo':
      return await GlobalGetData(data.methodType, guestConfig(
        douyinApiUrls.getGuestMusicInfo({ music_id: data.music_id })
      ))

    case 'guestMusicAwemeList':
      return await GlobalGetData(data.methodType, guestConfig(
        douyinApiUrls.getGuestMusicAwemeList({
          music_id: data.music_id,
          number: data.number,
          cursor: data.cursor
        })
      ))

    case 'emojiResourceMeta':
      /** App 的资源包接口：免鉴权，但要 Android UA，且不能带 douyin.com 那套默认头 */
      return await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
        },
        timeout: 15000,
        url: douyinApiUrls.getEmojiResourceMeta()
      })

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

      const segments: Array<{ start: number; end: number }> = []
      let currentStart = startTime

      while (currentStart < endTime) {
        const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, endTime)
        segments.push({ start: currentStart, end: currentEnd })
        currentStart = currentEnd
      }

      emitLogDebug(`弹幕数据需要分${segments.length}段获取，总时长：${totalDuration}ms`)

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

          emitLogDebug(`弹幕第${index + 1}段获取成功 (${segment.start}ms-${segment.end}ms)`)
          return segmentData
        } catch (error) {
          emitLogDebug(`弹幕第${index + 1}段获取失败 (${segment.start}ms-${segment.end}ms):`, error)
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

      emitLogDebug(`弹幕数据合并完成，共获取${mergedDanmakuList.length}条弹幕`)
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
      emitLogWarn(`未知的抖音数据接口：「${(data as any).methodType}」`)
      return null
    }
  }
}

/**
 * 通用分页请求配置接口
 *
 * @template T - 列表项类型
 * @template P - 请求参数类型
 * @template R - 最终返回类型
 * @template RawResp - 原始响应类型
 */
interface PaginationConfig<T, P, R, RawResp = any> {
  /** 请求类型标识，用于日志和错误追踪 */
  type: string
  /** API URL 生成器函数，根据参数生成请求 URL */
  apiUrlGenerator: (params: P) => string
  /** 初始请求参数 */
  params: P
  /** 单次请求的最大数据量 */
  maxPageSize: number
  /** Axios 请求配置 */
  requestConfig: AxiosRequestConfig
  /** 签名算法类型，null 表示不需要签名 */
  signType?: SignType | null
  /** 从响应中提取列表数据的函数 */
  extractList: (response: RawResp) => T[]
  /** 根据上次响应更新请求参数的函数，用于翻页 */
  updateParams: (currentParams: P, lastResponse: RawResp) => P
  /** 判断是否还有更多数据的函数 */
  hasMore: (lastResponse: RawResp) => boolean
  /** 格式化最终响应的函数，将所有数据整合到最终格式 */
  formatFinalResponse: (lastResponse: RawResp, allData: T[]) => R
  /** 可选的原始响应预处理函数，用于处理特殊响应格式 */
  processRawResponse?: (raw: any) => RawResp
  /** 可选的首页数据验证函数，用于检测反爬或异常情况 */
  validateFirstPage?: (data: T[], response: RawResp, url: string) => any | null
}

/**
 * 通用的分页请求函数
 */
const fetchPaginatedData = async <T, P, R, RawResp = any>(config: PaginationConfig<T, P, R, RawResp>): Promise<R> => {
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

  /** 分页接口同样在 SDK 的 webSign 策略表里，此处在 `DouyinData` 之外，需要自己再套一层 */
  const cookie = requestConfig.headers?.Cookie as string | undefined
  const secsdkUifid = extractUifidFromCookie(cookie)
  const buildSignedUrl = (url: string, st: SignType, ua: string): string =>
    douyinSign.SecSdk(buildSignedUrlBase(withDouyinWebid(url, cookie), st, ua), { uifid: secsdkUifid, method: requestConfig.method })

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
    const response = await fetchResponse<any>(config)

    if (isNetworkErrorResult(response)) {
      const networkError = new Error(response.error.amagiError.errorDescription)
      Object.assign(networkError, {
        code: response.error.code,
        data: null,
        amagiError: { ...response.error.amagiError, requestType: type }
      })
      throw networkError
    }

    /** 抖音在每个响应头里回本次会话的 webid，顺手缓存，下次请求就能带上 */
    rememberDouyinWebid(config.headers as Record<string, any> | undefined, response.headers as Record<string, any>)

    const result = response.data

    /**
     * 纯文本 body 说明被风控拦了，不是数据。
     *
     * 判据不能只看「是不是字符串」：综合搜索的 `general/search/stream/` 本来就回
     * 「十六进制长度行 + JSON」的分块流，由下游 `parseDouyinMultiJson` 解析。
     * 所以只有命中 Argus 关键字、或者整段里连一个 JSON 对象都没有时才算失败。
     */
    if (typeof result === 'string' && result.trim() !== '') {
      const snippet = result.trim().slice(0, 200)
      const isArgus = /ArgusSecurityPlugin|Blocked by/i.test(snippet)
      if (isArgus || !result.includes('{"')) {
        const ErrA: ErrorDetail = {
          errorDescription: isArgus ? `抖音风控拦截（Argus）：${snippet}` : `接口返回了非 JSON 内容：${snippet}`,
          requestType: type ?? '未知请求类型',
          requestUrl: config.url!
        }
        warningMessage = `
      获取响应数据失败！原因：${ErrA.errorDescription}
      请求类型：「${type}」
      请求URL：${config.url}
      `
        emitLogWarn(warningMessage)
        const argusError = new Error(ErrA.errorDescription)
        Object.assign(argusError, {
          code: isArgus ? 'ARGUS_BLOCKED' : 'NON_JSON_RESPONSE',
          data: null,
          amagiError: ErrA,
          argusBody: snippet
        })
        throw argusError
      }
    }

    if (!result || result === '') {
      const emptyReason =
        '接口返回内容为空，可能的原因：①请求的设备类参数与 cookie 会话不匹配（多为 webid，抖音会静默返回 0 字节）；'
        + '②目标数据本身不公开（例如对方隐藏了「喜欢」列表）；③抖音ck已失效'
      const Err: ErrorDetail = {
        errorDescription: `获取响应数据失败！${emptyReason}`,
        requestType: type ?? '未知请求类型',
        requestUrl: config.url!
      }
      warningMessage = `
      获取响应数据失败！原因：${emptyReason}
      请求类型：「${type}」
      请求URL：${config.url}
      `
      emitLogWarn(warningMessage)
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
      获取响应数据失败！原因：${filterReason}
      请求类型：「${type}」
      请求URL：${config.url}
      `
      emitLogWarn(warningMessage)
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
    } catch {}
  }
  return parsed
}

/** 只保留包含 cursor/has_more/data 的合法搜索响应 */
const filterSearchResponses = (objs: any[]): any[] => {
  return objs.filter((o) => o && typeof o.cursor === 'number' && typeof o.has_more === 'number' && Array.isArray(o.data))
}
