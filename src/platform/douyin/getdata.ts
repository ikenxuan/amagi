import { fetchData, isNetworkErrorResult, logger } from 'amagi/model'
import { getDouyinDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { DouyinDataOptionsMap } from 'amagi/types'
import { amagiAPIErrorCode, douoyinAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { AxiosRequestConfig } from 'axios'

/**
 * 抖音数据获取模块
 *
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/douyin → DataFetchers
 */
import { createDouyinApiUrls } from './API'
import { douyinSign } from './sign'

/**
 * 接口URL生成器类型定义
 * @template T - 参数类型
 */
type ApiUrlGenerator<T> = (params: T) => string

/**
 * 签名算法类型
 */
type SignType = 'a_bogus' | 'x_bogus'

/**
 * 获取签名参数
 * @param url - 需要签名的URL
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
 * 构建带签名的URL
 * @param url - 基础URL
 * @param signType - 签名算法类型
 * @param userAgent - 用户代理
 * @returns 带签名的完整URL
 */
const buildSignedUrl = (url: string, signType: SignType = 'a_bogus', userAgent: string): string => {
  const signature = getSignature(url, signType, userAgent)
  const paramName = getSignParamName(signType)
  return `${url}&${paramName}=${signature}`
}

/**
 * 抖音数据获取函数
 * @param data - 请求数据参数
 * @param cookie - 用户Cookie
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

  // 从请求配置中获取User-Agent，创建对应的API实例
  const userAgent = baseRequestConfig.headers?.['User-Agent'] as string
  const douyinApiUrls = createDouyinApiUrls(userAgent)

  // 获取签名算法类型，默认为 a_bogus
  const signType = (data as any).signType ?? 'a_bogus'

  switch (data.methodType) {
    case '文字作品数据':
    case '聚合解析':
    case '视频作品数据':
    case '图集作品数据':
    case '合辑作品数据': {
      const url = douyinApiUrls.视频或图集({ aweme_id: data.aweme_id })
      const VideoData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return VideoData
    }

    case '评论数据': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['评论数据']['opt']> = (params: DouyinDataOptionsMap['评论数据']['opt']) => douyinApiUrls.评论(params)
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['评论数据']['opt'], DouyinReturnTypeMap['评论数据'], DouyinReturnTypeMap['评论数据']>({
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

    case '指定评论回复数据': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['指定评论回复数据']['opt']> = (params: DouyinDataOptionsMap['指定评论回复数据']['opt']) => douyinApiUrls.二级评论(params)
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['指定评论回复数据']['opt'], DouyinReturnTypeMap['指定评论回复数据'], DouyinReturnTypeMap['指定评论回复数据']>({
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

    case '用户主页数据': {
      const url = douyinApiUrls.用户主页信息({ sec_uid: data.sec_uid })
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          // 只有在外部配置没有Referer时才设置内部的Referer
          ...(!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        }
      }
      const UserInfoData = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return UserInfoData
    }

    case 'Emoji数据': {
      const url = douyinApiUrls.表情()
      const EmojiData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url
      })
      return EmojiData
    }

    case '用户主页视频列表数据': {
      const url = douyinApiUrls.用户主页视频({ sec_uid: data.sec_uid })
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...(!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        }
      }
      const UserVideoListData = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return UserVideoListData
    }

    case '热点词数据': {
      const url = douyinApiUrls.热点词({ query: data.query })
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...(!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          }
        }
      }
      const SuggestWordsData = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return SuggestWordsData
    }

    case '搜索数据': {
      const searchType = data.type ?? '综合'
      const refererUrl = searchType === '用户'
        ? `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}?type=user`
        : searchType === '视频'
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

      const isUserSearch = searchType === '用户'
      const isVideoSearch = searchType === '视频'

      const response = await fetchPaginatedData<any, any, DouyinReturnTypeMap['搜索数据'], DouyinReturnTypeMap['搜索数据']>({
        type: data.methodType,
        apiUrlGenerator: (params) => douyinApiUrls.搜索(params),
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

          // 这里由于 raw 类型比较复杂（联合类型），先断言为 any 进行松散检查，或者使用类型守卫
          const rawAny = raw as any

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
            // 第一次请求失败不打印警告，直接返回错误（保持原逻辑）
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
          if (isUserSearch) return { ...resp, user_list: list } as any
          return { ...resp, data: list } as any
        }
      })

      return response
    }

    case '动态表情数据': {
      const url = douyinApiUrls.互动表情()
      const ExpressionPlusData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return ExpressionPlusData
    }

    case '音乐数据': {
      const url = douyinApiUrls.背景音乐({ music_id: data.music_id })
      const MusicData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return MusicData
    }

    case '直播间信息数据': {
      let url = douyinApiUrls.直播间信息({ room_id: data.room_id, web_rid: data.web_rid })
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

      const LiveRoomData = await GlobalGetData(data.methodType, {
        ...liveCustomConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return LiveRoomData
    }

    case '申请二维码数据': {
      const url = douyinApiUrls.申请二维码({ verify_fp: data.verify_fp })
      const LoginQrcodeStatusData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: buildSignedUrl(url, signType, userAgent)
      })
      return LoginQrcodeStatusData
    }

    case '弹幕数据': {
      // 弹幕接口限制：每次最多获取32000ms（32秒）区间的弹幕
      const MAX_SEGMENT_DURATION = 32000

      // 如果用户没有指定start_time和end_time，则获取整个视频的弹幕
      const startTime = data.start_time ?? 0
      const endTime = data.end_time ?? data.duration
      const totalDuration = endTime - startTime

      // 如果请求区间小于等于32秒，直接请求
      if (totalDuration <= MAX_SEGMENT_DURATION) {
        const url = douyinApiUrls.弹幕({
          aweme_id: data.aweme_id,
          start_time: startTime,
          end_time: endTime,
          duration: data.duration
        })
        const DanmakuData = await GlobalGetData(data.methodType, {
          ...baseRequestConfig,
          url: buildSignedUrl(url, signType, userAgent)
        })
        return DanmakuData
      }

      // 分段获取弹幕数据
      const segments: Array<{ start: number, end: number }> = []
      let currentStart = startTime

      // 计算所有需要请求的时间段
      while (currentStart < endTime) {
        const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, endTime)
        segments.push({ start: currentStart, end: currentEnd })
        currentStart = currentEnd
      }

      logger.debug(`弹幕数据需要分${segments.length}段获取，总时长：${totalDuration}ms`)

      // 并发请求所有段的弹幕数据
      const segmentPromises = segments.map(async (segment, index) => {
        const url = douyinApiUrls.弹幕({
          aweme_id: data.aweme_id,
          start_time: segment.start,
          end_time: segment.end,
          duration: data.duration
        })

        try {
          const segmentData = await GlobalGetData(`${data.methodType}-段${index + 1}`, {
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

      // 等待所有段的数据返回
      const segmentResults = await Promise.all(segmentPromises)

      // 合并所有段的弹幕数据
      const mergedDanmakuList: any[] = []
      let totalCount = 0
      let finalStartTime = startTime
      let finalEndTime = endTime
      let finalExtra: any = null
      let finalLogPb: any = null
      let finalStatusCode = 0

      segmentResults.forEach((segmentData, index) => {
        if (segmentData && segmentData.danmaku_list) {
          // 合并弹幕列表
          mergedDanmakuList.push(...segmentData.danmaku_list)
          totalCount += segmentData.total ?? 0

          // 保存第一段的额外信息作为最终结果的基础信息
          if (index === 0) {
            finalExtra = segmentData.extra
            finalLogPb = segmentData.log_pb
            finalStatusCode = segmentData.status_code
          }
        }
      })

      // 按时间排序弹幕（确保弹幕按时间顺序排列）
      mergedDanmakuList.sort((a, b) => (a.offset_time ?? 0) - (b.offset_time ?? 0))

      // 构造最终的弹幕数据结构
      const finalDanmakuData = {
        danmaku_list: mergedDanmakuList,
        start_time: finalStartTime,
        end_time: finalEndTime,
        total: mergedDanmakuList.length, // 使用实际合并后的数量
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
        const resp = await GlobalGetData((data as any).methodType ?? '自定义请求', {
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

type CommentGlobalParams = {
  /** 视频ID */
  aweme_id: string
  /**
   * 获取的评论数量
   * 默认情况下，如果指定的数量不足，则获取实际的评论数量。
   */
  number?: number
  /**
   * 游标，作用类似于翻页，根据上一次评论数量递增
   * @defaultValue 0
   */
  cursor?: number
}

/**
 * 通用分页请求配置接口
 * @template T - 列表项的数据类型 (例如: CommentItem, UserItem, VideoItem)
 * @template P - 请求参数的数据类型 (例如: { cursor: number, aweme_id: string })
 * @template R - 最终返回的数据类型 (例如: DyWorkComments, DySearchInfo)
 * @template RawResp - 接口原始响应类型 (默认为 any，可指定具体类型以获得类型提示)
 */
interface PaginationConfig<T, P, R, RawResp = any> {
  /**
   * 请求类型标识
   * 用于日志记录和错误追踪，例如 '评论数据', '搜索数据'
   */
  type: string

  /**
   * 接口 URL 生成器函数
   * 根据当前参数生成请求 URL
   * @param params - 当前请求参数
   * @returns 完整的接口路径 (不包含域名和签名参数)
   */
  apiUrlGenerator: (params: P) => string

  /**
   * 初始请求参数
   * 包含第一次请求所需的所有字段
   */
  params: P

  /**
   * 单次请求的最大数据量限制
   * 即使 params.number 指定了更大的数量，每次请求也不会超过此值
   * 用于计算剩余需要请求的数量
   */
  maxPageSize: number

  /**
   * Axios 请求配置
   * 包含 headers (如 User-Agent, Referer) 等基础配置
   */
  requestConfig: AxiosRequestConfig

  /**
   * 签名算法类型
   * - 'a_bogus': 默认签名算法
   * - 'x_bogus': 旧版签名算法
   * - null: 不进行签名 (直接使用原始 URL)
   */
  signType?: SignType | null

  /**
   * 数据提取函数
   * 从原始响应对象中提取出数据列表数组
   * @param response - 接口返回的原始 JSON 对象
   * @returns 提取出的数据数组，如果无数据应返回空数组 []
   */
  extractList: (response: RawResp) => T[]

  /**
   * 参数更新函数
   * 根据上一次的响应结果，更新下一次请求的参数 (如翻页 cursor)
   * @param currentParams - 当前使用的请求参数
   * @param lastResponse - 上一次接口返回的原始响应
   * @returns 更新后的下一次请求参数
   */
  updateParams: (currentParams: P, lastResponse: RawResp) => P

  /**
   * 结束条件判断函数
   * 判断是否还有更多数据需要获取
   * @param lastResponse - 上一次接口返回的原始响应
   * @returns true 表示还有更多数据，false 表示已结束
   */
  hasMore: (lastResponse: RawResp) => boolean

  /**
   * 最终响应格式化函数
   * 将所有获取到的数据合并，构造成最终符合 TypeScript 接口定义的返回结构
   * @param lastResponse - 最后一次接口返回的原始响应 (通常包含 extra, log_pb 等元数据)
   * @param allData - 所有分组合并后的完整数据列表 (已根据 params.number 截断)
   * @returns 最终返回给调用者的数据对象
   */
  formatFinalResponse: (lastResponse: RawResp, allData: T[]) => R

  /**
   * (可选) 原始响应预处理函数
   * 在数据提取前对原始响应进行转换，例如处理抖音特殊的 multi-json 格式
   * @param raw - Axios 返回的原始数据
   * @returns 处理后的 JSON 对象
   */
  processRawResponse?: (raw: any) => RawResp

  /**
   * (可选) 首屏数据校验函数
   * 用于检测反爬虫、风控或 Cookie 失效等异常情况
   * 仅在第一次请求完成后调用
   * @param data - 第一次请求提取出的数据列表
   * @param response - 第一次请求的原始响应
   * @param url - 请求的完整 URL (用于错误日志)
   * @returns 如果校验失败返回错误对象 (ErrorDetail)，校验通过返回 null
   */
  validateFirstPage?: (data: T[], response: RawResp, url: string) => any | null
}

/**
 * 通用的分页请求函数
 * 封装了循环分页请求、数据合并、错误处理和反爬检测逻辑
 *
 * @template T - 列表项类型
 * @template P - 参数类型
 * @template R - 返回值类型
 * @template RawResp - 原始响应类型
 * @param config - 分页请求配置对象
 * @returns Promise<R> 返回最终构造的数据对象
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

  // 获取目标数量，优先使用 params 中的 number，否则使用 maxPageSize
  const targetNumber = Number((params as any).number ?? maxPageSize)

  while (fetchedData.length < targetNumber) {
    const currentCount = fetchedData.length
    const remaining = targetNumber - currentCount
    const requestCount = Math.min(remaining, maxPageSize)

      // 更新请求数量
      ; (currentParams as any).number = requestCount

    const url = apiUrlGenerator(currentParams)
    const finalUrl = signType ? buildSignedUrl(url, signType, userAgent) : url

    const raw = await GlobalGetData(type, {
      ...requestConfig,
      url: finalUrl
    })

    const response = processRawResponse ? processRawResponse(raw) : raw

    // 检查是否为错误响应（GlobalGetData 可能返回错误对象）
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

  // 如果需要截断数据以匹配精确数量
  const slicedData = targetNumber === 0 ? [] : fetchedData.slice(0, targetNumber)

  return formatFinalResponse(lastResponse, slicedData)
}

/**
 * 全局数据获取函数
 * @param type - 请求类型
 * @param config - 完整的axios请求配置
 * @returns 返回请求结果或错误详情
 */
const GlobalGetData = async (type: string, config: AxiosRequestConfig): Promise<any | ErrorDetail> => {
  let warningMessage = ''
  try {
    const result = await fetchData(config)

    // 处理网络层错误（自动重试后仍失败）
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

    // 处理视频被隐藏或删除的情况
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

  /**
   * 遇到 { → 深度 +1
   * 遇到 } → 深度 -1
   * 当深度回到 0 时 → 找到一个完整 JSON
   */
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
