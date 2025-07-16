import { getDouyinDefaultConfig } from 'amagi/platform/defaultConfigs'
import { logger, fetchData } from 'amagi/model'
/**
 * 抖音数据获取模块
 * 
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/douyin → DataFetchers
 */
import { douyinApiUrls } from './API'
import { douyinSign } from './sign'
import { DouyinDataOptionsMap } from 'amagi/types'
import { amagiAPIErrorCode, douoyinAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
import { AxiosRequestConfig } from 'axios'
import { RequestConfig } from 'amagi/server'

/**
 * 接口URL生成器类型定义
 * @template T - 参数类型
 */
type ApiUrlGenerator<T> = (params: T) => string

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
      ...(requestConfig?.headers || {})
    }
  }

  switch (data.methodType) {
    case '聚合解析':
    case '视频作品数据':
    case '图集作品数据':
    case '合辑作品数据': {
      const url = douyinApiUrls.视频或图集({ aweme_id: data.aweme_id })
      const VideoData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: `${url}&a_bogus=${douyinSign.AB(url)}`
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
        baseRequestConfig
      )
      return response
    }

    case '指定评论回复数据': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['指定评论回复数据']['opt']> = (params: DouyinDataOptionsMap['指定评论回复数据']['opt']) => douyinApiUrls.二级评论(params)
      // 特殊情况：需要设置特定的referer
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          // 只有在外部配置没有referer时才设置内部的referer
          ...((!requestConfig?.headers || !('referer' in requestConfig.headers)) && {
            referer: `https://www.douyin.com/note/${data.aweme_id}`
          })
        }
      }
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['指定评论回复数据']['opt']>(
        data.methodType,
        urlGenerator,
        data,
        3,
        customConfig
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
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          })
        }
      }
      const UserInfoData = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: `${url}&a_bogus=${douyinSign.AB(url)}`
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
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          })
        }
      }
      const UserVideoListData = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: `${url}&a_bogus=${douyinSign.AB(url)}`
      })
      return UserVideoListData
    }

    case '热点词数据': {
      const url = douyinApiUrls.热点词({ query: data.query, number: data.number ?? 10 })
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          })
        }
      }
      const SuggestWordsData = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: `${url}&a_bogus=${douyinSign.AB(url)}`
      })
      return SuggestWordsData
    }

    case '搜索数据': {
      let search_id = ''
      const maxPageSize = 15 // 接口单次请求的最大数据量
      let fetchedSearchList: any[] = [] // 用于存储实际获取的所有数据
      let tmpresp: any = {}

      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          })
        }
      }

      // 循环直到获取到足够数量的数据
      while (fetchedSearchList.length < Number(data.number ?? 10)) {
        // 计算本次请求需要获取的数据数量，确保不超过剩余需要获取的数量
        const requestCount = Math.min(Number(data.number ?? 50) - fetchedSearchList.length, maxPageSize)

        // 构建请求URL
        const url = douyinApiUrls.搜索({
          query: data.query,
          number: requestCount,
          search_id: search_id === '' ? undefined : search_id
        })

        // 发起请求获取数据
        const response = await GlobalGetData(data.methodType, {
          ...customConfig,
          url: `${url}&a_bogus=${douyinSign.AB(url)}`
        })

        if (response.data?.length === 0) {
          logger.warn('获取搜索数据失败！请求成功但接口返回内容为空\n你的抖音ck可能已经失效！\n请求类型：' + data.methodType)
          return false
        }
        if (!response.data) {
          response.data = []
        }
        // 将获取到的数据添加到数组中
        fetchedSearchList.push(...response.data)

        // 更新tmpresp为最后一次请求的响应
        tmpresp = response

        // 更新游标值，准备下一次请求
        search_id = response.log_pb?.impr_id
      }

      // 使用最后一次请求的接口响应格式，替换其中的数据
      const finalResponse = {
        ...tmpresp,
        data: data.number === 0 ? [] : fetchedSearchList.slice(0, Number(data.number ?? 10))
      }
      return finalResponse
    }

    case '动态表情数据': {
      const url = douyinApiUrls.互动表情()
      const ExpressionPlusData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: `${url}&a_bogus=${douyinSign.AB(url)}`
      })
      return ExpressionPlusData
    }

    case '音乐数据': {
      const url = douyinApiUrls.背景音乐({ music_id: data.music_id })
      const MusicData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: `${url}&a_bogus=${douyinSign.AB(url)}`
      })
      return MusicData
    }

    case '直播间信息数据': {
      let url = douyinApiUrls.用户主页信息({ sec_uid: data.sec_uid })
      const fetchUrl = `${url}&a_bogus=${douyinSign.AB(url)}`
      const customConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          })
        }
      }

      const UserInfoData = await GlobalGetData(data.methodType, {
        ...customConfig,
        url: fetchUrl
      })

      if (!UserInfoData?.user?.live_status || UserInfoData.user.live_status !== 1) {
        logger.error((UserInfoData?.user?.nickname || '用户') + '当前未在直播')
        const Err: ErrorDetail = {
          errorDescription: '检查失败！该用户当前未在直播！ TypeError: Cannot read properties of undefined (reading \'live_status\')',
          requestType: data.methodType ?? '未知请求类型',
          requestUrl: fetchUrl,
        }
        return {
          code: douoyinAPIErrorCode.NOT_LIVE,
          data: UserInfoData,
          amagiError: Err,
          amagiMessage: Err.errorDescription
        }
      }

      if (!UserInfoData.user.room_data) {
        logger.error('未获取到直播间信息！')
        return {
          code: 500,
          message: '未获取到直播间信息！',
          data: null
        }
      }

      const room_data = JSON.parse(UserInfoData.user.room_data)
      url = douyinApiUrls.直播间信息({ room_id: UserInfoData.user.room_id_str as string, web_rid: room_data.owner.web_rid as string })

      const liveCustomConfig = {
        ...baseRequestConfig,
        headers: {
          ...baseRequestConfig.headers,
          ...((!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {
            Referer: `https://live.douyin.com/${room_data.owner.web_rid}`
          })
        }
      }

      const LiveRoomData = await GlobalGetData(data.methodType, {
        ...liveCustomConfig,
        url: `${url}&a_bogus=${douyinSign.AB(url)}`
      })
      return LiveRoomData
    }

    case '申请二维码数据': {
      const url = douyinApiUrls.申请二维码({ verify_fp: data.verify_fp })
      const LoginQrcodeStatusData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: `${url}&a_bogus=${douyinSign.AB(url)}`
      })
      return LoginQrcodeStatusData
    }

    default: {
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
 * @returns 返回分页数据
 */
const fetchPaginatedData = async <T, P extends CommentGlobalParams> (
  type: string,
  apiUrlGenerator: ApiUrlGenerator<P>,
  params: P,
  maxPageSize: number,
  requestConfig: AxiosRequestConfig
): Promise<T> => {
  let cursor = params.cursor ?? 0
  let fetchedData: any[] = []
  let tmpresp: any = {}

  while (fetchedData.length < Number(params.number ?? maxPageSize)) {
    const requestCount = Math.min(Number(params.number ?? maxPageSize) - fetchedData.length, maxPageSize)

    const url = apiUrlGenerator({
      ...params,
      number: requestCount,
      cursor
    })

    const response = await GlobalGetData(type, {
      ...requestConfig,
      url: `${url}&a_bogus=${douyinSign.AB(url)}`
    })

    fetchedData.push(...response.comments || response.data || [])
    tmpresp = response

    if ((response.comments || response.data || []).length < requestCount) {
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
        requestUrl: config.url!,
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow('接口返回内容为空，你的抖音ck可能已经失效！')}
      请求类型：「${type}」
      请求URL：${config.url}
      `
      logger.warn(warningMessage)
      throw {
        code: douoyinAPIErrorCode.COOKIE,
        data: result,
        amagiError: Err
      }
    }

    // 处理视频被隐藏或删除的情况
    if (result.filter_detail && result.filter_detail.filter_reason) {
      const filterReason = result.filter_detail.filter_reason
      const Err: ErrorDetail = {
        errorDescription: `获取响应数据失败！原因：${filterReason}！`,
        requestType: type ?? '未知请求类型',
        requestUrl: config.url!,
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow(filterReason)}
      请求类型：「${type}」
      请求URL：${config.url}
      `
      logger.warn(warningMessage)
      throw {
        code: douoyinAPIErrorCode.FILTER,
        data: result,
        amagiError: Err
      }
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
        requestUrl: config.url,
      },
      amagiMessage: warningMessage
    }
  }
}