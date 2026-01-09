import { fetchData, isNetworkErrorResult, logger } from 'amagi/model'
import { getXiaohongshuDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { ErrorDetail } from 'amagi/types/NetworksConfigType'
import { extractCreatorInfoFromHtml } from 'amagi/validation/utils'
import { AxiosRequestConfig } from 'axios'

import { createXiaohongshuApiUrls } from './API'
import { xiaohongshuSign } from './sign'

/**
 * 小红书数据获取函数
 * @param data - 请求数据参数
 * @param cookie - 用户Cookie
 * @param requestConfig - 外部请求配置
 * @returns 返回小红书数据
 */
export const XiaohongshuData = async <T extends keyof XiaohongshuDataOptionsMap> (
  data: XiaohongshuDataOptionsMap[T]['opt'],
  cookie?: string,
  requestConfig?: RequestConfig
) => {
  const defHeaders = getXiaohongshuDefaultConfig(cookie)['headers']

  const baseRequestConfig: AxiosRequestConfig = {
    method: 'POST',
    timeout: 10000,
    ...requestConfig,
    headers: {
      ...defHeaders,
      ...(requestConfig?.headers ?? {})
    }
  }

  const xiaohongshuApiUrls = createXiaohongshuApiUrls()

  switch (data.methodType) {
    case 'homeFeed': {
      const homeFeedData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.homeFeed(data).Url,
        data: JSON.stringify(xiaohongshuApiUrls.homeFeed(data).Body),
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSPost(
            xiaohongshuApiUrls.homeFeed(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web',
            xiaohongshuApiUrls.homeFeed(data).Body
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(cookie ?? ''),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return homeFeedData
    }

    case 'noteDetail': {
      const noteData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.noteDetail(data).Url,
        data: xiaohongshuApiUrls.noteDetail(data).Body,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSPost(
            xiaohongshuApiUrls.noteDetail(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web',
            xiaohongshuApiUrls.noteDetail(data).Body
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(cookie ?? ''),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return noteData
    }

    case 'noteComments': {
      const baseRequestConfig: AxiosRequestConfig = {
        method: 'GET',
        timeout: 10000,
        ...requestConfig,
        headers: {
          ...defHeaders,
          ...(requestConfig?.headers ?? {})
        }
      }

      const commentData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.noteComments(data).Url,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSGet(
            xiaohongshuApiUrls.noteComments(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(cookie ?? ''),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return commentData
    }

    case 'userProfile': {
      const baseRequestConfig: AxiosRequestConfig = {
        method: 'GET',
        timeout: 10000,
        ...requestConfig,
        headers: {
          ...defHeaders,
          ...(requestConfig?.headers ?? {})
        }
      }

      const userData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.userProfile(data).Url,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSGet(
            xiaohongshuApiUrls.userProfile(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(cookie ?? ''),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      const pageData = extractCreatorInfoFromHtml(userData)

      return {
        code: 0,
        data: pageData,
        msg: 'success'
      }
    }

    case 'userNoteList': {
      const userNoteData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        method: 'GET',
        url: xiaohongshuApiUrls.userNoteList(data).Url,
        headers: {
          ...baseRequestConfig.headers,
          'x-b3-traceid': xiaohongshuSign.generateXB3Traceid(),
          'x-s': xiaohongshuSign.generateXSGet(
            xiaohongshuApiUrls.userNoteList(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(cookie ?? ''),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return userNoteData
    }

    case 'emojiList': {
      const baseRequestConfig: AxiosRequestConfig = {
        method: 'GET',
        timeout: 10000,
        ...requestConfig,
        headers: {
          ...defHeaders,
          ...(requestConfig?.headers ?? {})
        }
      }

      const emojiListData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.emojiList(data).Url,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSGet(
            xiaohongshuApiUrls.emojiList(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(cookie ?? ''),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return emojiListData
    }

    case 'searchNotes': {
      const searchNoteData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.searchNotes(data).Url,
        data: xiaohongshuApiUrls.searchNotes(data).Body,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSPost(
            xiaohongshuApiUrls.searchNotes(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(cookie ?? ''),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return searchNoteData
    }

    default:
      throw new Error(`Unknown Xiaohongshu API method: "${logger.red((data as any).methodType)}"`)
  }
}

/**
 * 全局数据获取函数
 */
const GlobalGetData = async (methodType: string, config: AxiosRequestConfig) => {
  try {
    const response = await fetchData(config)

    // 处理网络层错误（自动重试后仍失败）
    if (isNetworkErrorResult(response)) {
      const networkError = new Error(response.error.amagiError.errorDescription)
      Object.assign(networkError, {
        code: response.error.code,
        data: null,
        amagiError: { ...response.error.amagiError, requestType: methodType }
      })
      throw networkError
    }

    if (typeof response === 'string' && response.includes('<html>')) {
      return response
    }
    if (response.code !== 0) {
      throw new Error(`API request failed: ${response.data?.msg ?? response.msg ?? 'Unknown error'}, code: ${response.code}`)
    }

    return response
  } catch (error: any) {
    logger.error(`Xiaohongshu API request failed [${methodType}]:`, error.message)

    const errorDetail: ErrorDetail = {
      errorDescription: error.message ?? 'Unknown error',
      requestType: methodType,
      requestUrl: config.url ?? ''
    }

    return {
      code: 500,
      message: 'error',
      data: null,
      amagiError: errorDetail,
      amagiMessage: `Xiaohongshu API request failed: ${error.message}`
    }
  }
}
