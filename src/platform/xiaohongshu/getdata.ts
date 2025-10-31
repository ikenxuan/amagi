import { fetchData, logger } from 'amagi/model'
import { getXiaohongshuDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { amagiAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
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
    case '首页推荐数据': {
      const homeFeedData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.首页推荐数据(data).Url,
        data: JSON.stringify(xiaohongshuApiUrls.首页推荐数据(data).Body),
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSPost(
            xiaohongshuApiUrls.首页推荐数据(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web',
            xiaohongshuApiUrls.首页推荐数据(data).Body
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return homeFeedData
    }

    case '单个笔记数据': {
      const noteData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.单个笔记数据(data).Url,
        data: xiaohongshuApiUrls.单个笔记数据(data).Body,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSPost(
            xiaohongshuApiUrls.单个笔记数据(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web',
            xiaohongshuApiUrls.单个笔记数据(data).Body
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return noteData
    }

    case '评论数据': {
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
        url: xiaohongshuApiUrls.评论数据(data).Url,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSGet(
            xiaohongshuApiUrls.评论数据(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return commentData
    }

    case '用户数据': {
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
        url: xiaohongshuApiUrls.用户数据(data).Url,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSGet(
            xiaohongshuApiUrls.用户数据(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      const pageData = extractCreatorInfoFromHtml(userData)

      return {
        code: 0,
        data: pageData,
        msg: '成功'
      }
    }

    case '用户笔记数据': {
      const userNoteData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        method: 'GET',
        url: xiaohongshuApiUrls.用户笔记数据(data).Url,
        headers: {
          ...baseRequestConfig.headers,
          'x-b3-traceid': xiaohongshuSign.generateXB3Traceid(),
          'x-s': xiaohongshuSign.generateXSGet(
            xiaohongshuApiUrls.用户笔记数据(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return userNoteData
    }

    case '表情列表': {
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
        url: xiaohongshuApiUrls.表情列表(data).Url,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSGet(
            xiaohongshuApiUrls.表情列表(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return emojiListData
    }

    case '搜索笔记': {
      const searchNoteData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: xiaohongshuApiUrls.搜索笔记(data).Url,
        data: xiaohongshuApiUrls.搜索笔记(data).Body,
        headers: {
          ...baseRequestConfig.headers,
          'x-s': xiaohongshuSign.generateXSPost(
            xiaohongshuApiUrls.搜索笔记(data).apiPath,
            xiaohongshuSign.extractA1FromCookie(cookie ?? ''),
            'xhs-pc-web'
          ),
          'x-s-common': xiaohongshuSign.generateXSCommon(),
          'x-t': xiaohongshuSign.generateXT()
        }
      })
      return searchNoteData
    }

    default:
      throw new Error(`未知的小红书数据接口: 「${logger.red((data as any).methodType)}」`)
  }
}

/**
 * 全局数据获取函数
 */
const GlobalGetData = async (methodType: string, config: AxiosRequestConfig) => {
  try {
    const response = await fetchData(config)

    if (typeof response === 'string' && response.includes('<html>')) {
      return response
    }
    if (response.code !== 0) {
      throw new Error(`API请求失败: ${response.data?.msg ?? response.msg ?? '未知错误'}, code: ${response.code}`)
    }

    return response
  } catch (error: any) {
    logger.error(`小红书API请求失败 [${methodType}]:`, error.message)

    const errorDetail: ErrorDetail = {
      errorDescription: error.message ?? '未知错误',
      requestType: methodType,
      requestUrl: config.url ?? ''
    }

    return {
      code: 500,
      message: 'error',
      data: null,
      amagiError: errorDetail,
      amagiMessage: `小红书API请求失败: ${error.message}`
    }
  }
}
