import { fetchData, logger } from 'amagi/model'
import { getDouyinDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { DouyinDataOptionsMap } from 'amagi/types'
import { amagiAPIErrorCode, douoyinAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
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
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['评论数据']['opt']>(
        data.methodType,
        urlGenerator,
        data,
        50,
        baseRequestConfig,
        signType
      )
      return response
    }

    case '指定评论回复数据': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['指定评论回复数据']['opt']> = (params: DouyinDataOptionsMap['指定评论回复数据']['opt']) => douyinApiUrls.二级评论(params)
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['指定评论回复数据']['opt']>(
        data.methodType,
        urlGenerator,
        data,
        3,
        baseRequestConfig,
        'x_bogus'
      )
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
      const url = douyinApiUrls.热点词({ query: data.query, number: data.number ?? 10 })
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
      let search_id = ''
      const maxPageSize = 15 // 接口单次请求的最大数据量
      let fetchedSearchList: any[] = [] // 存放所有获取到的 data 条目
      let tmpresp = null

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

      // 判断搜索类型
      const isUserSearch = searchType === '用户'
      const isVideoSearch = searchType === '视频'

      // 循环直到获取到足够数量的数据
      while (fetchedSearchList.length < Number(data.number ?? 10)) {
        // 计算本次请求需要获取的数据数量，确保不超过剩余需要获取的数量
        const requestCount = Math.min(Number(data.number ?? 50) - fetchedSearchList.length, maxPageSize)

        // 构建请求URL
        const url = douyinApiUrls.搜索({
          query: data.query,
          type: data.type,
          number: requestCount,
          search_id: search_id === '' ? undefined : search_id
        })

        const raw = await GlobalGetData(data.methodType, {
          ...customConfig,
          url
          // url: (isUserSearch || isVideoSearch) ? buildSignedUrl(url, 'x_bogus', userAgent) : buildSignedUrl(url, 'x_bogus', userAgent)
        })

        if (isUserSearch) {
          // 用户搜索逻辑：直接处理 JSON 响应
          if (!raw || typeof raw !== 'object') {
            logger.warn('抖音用户搜索返回无有效数据，疑似触发反爬\n你的抖音ck可能已经失效！\n请求类型：' + data.methodType)
            return {
              success: false,
              amagiError: '抖音用户搜索返回无有效数据，疑似触发反爬\n你的抖音ck可能已经失效！\n请求类型：' + data.methodType
            }
          }

          const userList = raw.user_list
          if (Array.isArray(userList) && userList.length > 0) {
            fetchedSearchList.push(...userList)
          }

          tmpresp = raw
          // 用户搜索使用 rid 作为下一页的 search_id
          search_id = raw.rid ?? search_id

          // 检查是否有更多数据
          if (typeof raw.has_more === 'number' && raw.has_more === 0) {
            break
          }

          // 如果本次请求返回的数据为空，退出循环
          if (!userList || userList.length === 0) {
            break
          }
        } else if (isVideoSearch) {
          // 视频搜索逻辑：直接处理 JSON 响应
          if (!raw || typeof raw !== 'object') {
            logger.warn('抖音视频搜索返回无有效数据，疑似触发反爬\n你的抖音ck可能已经失效！\n请求类型：' + data.methodType)
            return {
              success: false,
              amagiError: '抖音视频搜索返回无有效数据，疑似触发反爬\n你的抖音ck可能已经失效！\n请求类型：' + data.methodType
            }
          }

          const videoList = raw.data
          if (Array.isArray(videoList) && videoList.length > 0) {
            fetchedSearchList.push(...videoList)
          }

          tmpresp = raw
          // 视频搜索使用 log_pb.impr_id 作为下一页的 search_id
          search_id = raw.log_pb?.impr_id ?? search_id

          // 检查是否有更多数据
          if (typeof raw.has_more === 'number' && raw.has_more === 0) {
            break
          }

          // 如果本次请求返回的数据为空，退出循环
          if (!videoList || videoList.length === 0) {
            break
          }
        } else {
          // 综合搜索逻辑：解析多 JSON 响应
          const chunks: any[] = typeof raw === 'string'
            ? parseDouyinMultiJson(raw)
            : [raw]

          const responses = filterSearchResponses(chunks)

          if (responses.length === 0) {
            logger.warn('抖音搜索返回无有效数据，疑似触发反爬\n你的抖音ck可能已经失效！\n请求类型：' + data.methodType)
            return {
              success: false,
              amagiError: '抖音搜索返回无有效数据，疑似触发反爬\n你的抖音ck可能已经失效！\n请求类型：' + data.methodType
            }
          }

          // 将所有有效响应的 data 合并（按顺序）
          for (const resp of responses) {
            if (Array.isArray(resp.data) && resp.data.length > 0) {
              fetchedSearchList.push(...resp.data)
            }
            tmpresp = resp // 保留最后一个有效的响应对象
            search_id = resp.log_pb?.impr_id ?? search_id
          }

          // 如果最后一个包表明没有更多，提前退出
          if (tmpresp && typeof tmpresp.has_more === 'number' && tmpresp.has_more === 0) {
            break
          }
        }

        // 检查是否所有响应都没有有效数据
        if (fetchedSearchList.length === 0) {
          logger.warn('抖音搜索API请求成功，但返回数据长度为0，\n此问题暂时无法处理，也可能被风控！\n请求类型：' + data.methodType)
          return {
            success: false,
            amagiError: '抖音搜索API请求成功，但返回数据长度为0，\n此问题暂时无法处理，也可能被风控！\n请求类型：' + data.methodType
          }
        }
      }

      const slicedList = Number(data.number ?? 10) === 0 ? [] : fetchedSearchList.slice(0, Number(data.number ?? 10))

      const finalResponse = isUserSearch
        ? { ...(tmpresp ?? {}), user_list: slicedList }
        : isVideoSearch
          ? { ...(tmpresp ?? {}), data: slicedList }
          : { ...(tmpresp ?? {}), data: slicedList }

      return finalResponse
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
 * 通用的分页请求函数
 * @param type - 请求类型
 * @param apiUrlGenerator - 接口URL生成器
 * @param params - 请求参数
 * @param maxPageSize - 单次请求的最大数据量
 * @param requestConfig - axios请求配置（外部配置优先）
 * @param signType - 签名算法类型
 * @returns 返回分页数据
 */
const fetchPaginatedData = async <T, P extends CommentGlobalParams> (
  type: string,
  apiUrlGenerator: ApiUrlGenerator<P>,
  params: P,
  maxPageSize: number,
  requestConfig: AxiosRequestConfig,
  signType: SignType = 'a_bogus'
): Promise<T> => {
  let cursor = params.cursor ?? 0
  let fetchedData: any[] = []
  let tmpresp: any = {}

  const userAgent = requestConfig.headers?.['User-Agent'] as string

  while (fetchedData.length < Number(params.number ?? maxPageSize)) {
    const requestCount = Math.min(Number(params.number ?? maxPageSize) - fetchedData.length, maxPageSize)

    const url = apiUrlGenerator({
      ...params,
      number: requestCount,
      cursor
    })

    const response = await GlobalGetData(type, {
      ...requestConfig,
      url: buildSignedUrl(url, signType, userAgent)
    })

    fetchedData.push(...response.comments ?? response.data ?? [])
    tmpresp = response

    if ((response.comments ?? response.data ?? []).length < requestCount) {
      break
    }

    cursor = response.cursor
  }

  const finalResponse = {
    ...tmpresp,
    comments: params.number === 0 ? [] : fetchedData.slice(0, Number(params.number ?? maxPageSize)),
    cursor: params.number === 0 ? 0 : fetchedData.length
  }

  return finalResponse
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
