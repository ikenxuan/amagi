import { logger, Networks } from 'amagi/model'
/**
 * 抖音数据获取模块
 * 
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/douyin → DataFetchers
 */
import { douyinApiUrls } from './API'
import { douyinSign } from './sign'
import { DouyinDataOptionsMap, NetworksConfigType } from 'amagi/types'
import { amagiAPIErrorCode, douoyinAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
import { RawAxiosResponseHeaders } from 'axios'

interface CustomHeaders extends RawAxiosResponseHeaders {
  referer?: string
}

const defheaders: CustomHeaders = {
  accept: '*/*',
  priority: 'u=0, i',
  'content-type': 'application/json; charset=utf-8',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  referer: 'https://www.douyin.com/',
  'accept-encoding': 'gzip, deflate, br',
  connection: 'keep-alive'
}

/** 接口URL生成器 */
type ApiUrlGenerator<T> = (params: T) => string

export const DouyinData = async <T extends keyof DouyinDataOptionsMap> (
  data: DouyinDataOptionsMap[T]['opt'],
  cookie?: string
) => {
  const headers = {
    ...defheaders,
    cookie: cookie ? cookie.replace(/\s+/g, '') : ''
  }

  switch (data.methodType) {
    case '聚合解析':
    case '视频作品数据':
    case '图集作品数据':
    case '合辑作品数据': {
      const url = douyinApiUrls.视频或图集({ aweme_id: data.aweme_id })
      const VideoData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return VideoData
    }

    case '评论数据': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['评论数据']['opt']> = (params: DouyinDataOptionsMap['评论数据']['opt']) => douyinApiUrls.评论(params)
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['评论数据']['opt']>(urlGenerator, data, 50, headers)
      return response
    }

    case '指定评论回复数据': {
      const urlGenerator: ApiUrlGenerator<DouyinDataOptionsMap['指定评论回复数据']['opt']> = (params: DouyinDataOptionsMap['指定评论回复数据']['opt']) => douyinApiUrls.二级评论(params)
      const response = await fetchPaginatedData<any, DouyinDataOptionsMap['指定评论回复数据']['opt']>(urlGenerator, data, 3,
        {
          ...headers,
          referer: `https://www.douyin.com/note/${data.aweme_id}`
        }
      )
      return response
    }

    case '用户主页数据': {
      const url = douyinApiUrls.用户主页信息({ sec_uid: data.sec_uid })
      const UserInfoData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://www.douyin.com/user/${data.sec_uid}`
        },
        ...data
      })
      return UserInfoData
    }

    case 'Emoji数据': {
      const url = douyinApiUrls.表情()
      const EmojiData = await GlobalGetData({
        url,
        headers,
        ...data
      })
      return EmojiData
    }

    case '用户主页视频列表数据': {
      const url = douyinApiUrls.用户主页视频({ sec_uid: data.sec_uid })
      const UserVideoListData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://www.douyin.com/user/${data.sec_uid}`
        },
        ...data
      })
      return UserVideoListData
    }

    case '热点词数据': {
      const url = douyinApiUrls.热点词({ query: data.query, number: data.number ?? 10 })
      const SuggestWordsData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
        },
        ...data
      })
      return SuggestWordsData
    }

    case '搜索数据': {
      let search_id = ''
      const maxPageSize = 15 // 接口单次请求的最大评论数量
      let fetchedSearchList: any[] = [] // 用于存储实际获取的所有评论
      let tmpresp: any = {}

      // 循环直到获取到足够数量的评论
      while (fetchedSearchList.length < Number(data.number ?? 10)) {
        // 计算本次请求需要获取的评论数量，确保不超过剩余需要获取的数量
        const requestCount = Math.min(Number(data.number ?? 50) - fetchedSearchList.length, maxPageSize)

        // 构建请求URL
        const url = douyinApiUrls.搜索({
          query: data.query,
          number: requestCount,
          search_id: search_id === '' ? undefined : search_id
        })

        // 发起请求获取评论数据
        const response = await GlobalGetData({
          url: `${url}&a_bogus=${douyinSign.AB(url)}`,
          headers: {
            ...headers,
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          },
          ...data
        })
        if (response.data.length === 0) {
          logger.warn('获取搜索数据失败！请求成功但接口返回内容为空\n你的抖音ck可能已经失效！\n请求类型：' + data.methodType)
          return false
        }
        if (!response.data) {
          response.data = []
        }
        // 将获取到的评论数据添加到数组中
        fetchedSearchList.push(...response.data)

        // 更新tmpresp为最后一次请求的响应
        tmpresp = response

        // 更新游标值，准备下一次请求
        search_id = response.log_pb.impr_id
      }

      // 使用最后一次请求的接口响应格式，替换其中的评论数据
      const finalResponse = {
        ...tmpresp,
        data: data.number === 0 ? [] : fetchedSearchList.slice(0, Number(data.number ?? 10))
      }
      return finalResponse
    }

    case '动态表情数据': {
      const url = douyinApiUrls.互动表情()
      const ExpressionPlusData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return ExpressionPlusData
    }

    case '音乐数据': {
      const url = douyinApiUrls.背景音乐({ music_id: data.music_id })
      const MusicData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return MusicData
    }

    case '直播间信息数据': {
      let url = douyinApiUrls.用户主页信息({ sec_uid: data.sec_uid })
      const fetchUrl = `${url}&a_bogus=${douyinSign.AB(url)}`
      const UserInfoData = await GlobalGetData({
        url: fetchUrl,
        headers: {
          ...headers,
          Referer: `https://www.douyin.com/user/${data.sec_uid}`
        },
        ...data
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
      const LiveRoomData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://live.douyin.com/${room_data.owner.web_rid}`
        },
        ...data
      })
      return LiveRoomData
    }

    case '申请二维码数据': {
      const url = douyinApiUrls.申请二维码({ verify_fp: data.verify_fp })
      const LoginQrcodeStatusData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return LoginQrcodeStatusData
    }

    default:
      logger.warn(`未知的B站数据接口：「${logger.red((data as any).methodType)}」`)
      return null
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
 * @param apiUrlGenerator - 接口URL生成器
 * @param params - 请求参数
 * @param maxPageSize - 单次请求的最大数据量
 * @param headers - 请求头
 * @returns
 */
const fetchPaginatedData = async <T, P extends CommentGlobalParams> (
  apiUrlGenerator: ApiUrlGenerator<P>,
  params: P,
  maxPageSize: number,
  headers: CustomHeaders
): Promise<T> => {
  let cursor = params.cursor ?? 0 // 初始游标值
  let fetchedData: any[] = [] // 用于存储实际获取的所有数据
  let tmpresp: any = {}

  // 循环直到获取到足够数量的数据
  while (fetchedData.length < Number(params.number ?? maxPageSize)) {
    // 计算本次请求需要获取的数据数量，确保不超过剩余需要获取的数量
    const requestCount = Math.min(Number(params.number ?? maxPageSize) - fetchedData.length, maxPageSize)

    // 构建请求URL
    const url = apiUrlGenerator({
      ...params,
      number: requestCount,
      cursor
    })

    // 发起请求获取数据
    const response = await GlobalGetData({
      url: `${url}&a_bogus=${douyinSign.AB(url)}`,
      headers,
      ...params
    })

    // 将获取到的数据添加到数组中
    fetchedData.push(...response.comments || response.data || [])

    // 更新tmpresp为最后一次请求的响应
    tmpresp = response

    // 如果本次请求的数据数量小于请求的数量，说明已经没有更多数据了
    if ((response.comments || response.data || []).length < requestCount) {
      break
    }

    // 更新游标值，准备下一次请求
    cursor = response.cursor
  }

  // 使用最后一次请求的接口响应格式，替换其中的数据
  const finalResponse = {
    ...tmpresp,
    comments: params.number === 0 ? [] : fetchedData.slice(0, Number(params.number ?? maxPageSize)),
    cursor: params.number === 0 ? 0 : fetchedData.length
  }

  return finalResponse
}

/**
 * 数据获取函数
 * @param options - 网络请求配置选项
 */
const GlobalGetData = async (options: NetworksConfigType): Promise<any | ErrorDetail> => {
  let warningMessage = ''
  try {
    const result = await new Networks(options).getData()
    if (!result || result === '') {
      const Err: ErrorDetail = {
        errorDescription: '获取响应数据失败！接口返回内容为空，你的抖音ck可能已经失效！',
        requestType: options.methodType ?? '未知请求类型',
        requestUrl: options.url,
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow('接口返回内容为空，你的抖音ck可能已经失效！')}
      请求类型：「${options.methodType}」
      请求URL：${options.url}
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
        requestType: options.methodType ?? '未知请求类型',
        requestUrl: options.url,
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow(filterReason)}
      请求类型：「${options.methodType}」
      请求URL：${options.url}
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
        requestType: options.methodType,
        requestUrl: options.url,
      },
      amagiMessage: warningMessage
    }
  }
}