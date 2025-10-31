import { fetchData, logger } from 'amagi/model'
import { getKuaishouDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { KuaishouDataOptionsMap } from 'amagi/types'
import { amagiAPIErrorCode, ErrorDetail, kuaishouAPIErrorCode } from 'amagi/types/NetworksConfigType'
import { AxiosRequestConfig } from 'axios'

/**
 * 快手数据获取模块
 *
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/kuaishou → DataFetchers
 */
import { kuaishouApiUrls } from './API'

/**
 * 快手数据获取函数
 * @param data - 请求数据参数
 * @param cookie - 用户Cookie
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 返回快手数据
 */
export const KuaishouData = async <T extends keyof KuaishouDataOptionsMap> (
  data: KuaishouDataOptionsMap[T]['opt'],
  cookie?: string,
  requestConfig?: RequestConfig
) => {
  const defHeaders = getKuaishouDefaultConfig(cookie)['headers']

  const baseRequestConfig: AxiosRequestConfig = {
    method: 'POST',
    timeout: 10000,
    ...requestConfig,
    headers: {
      ...defHeaders,
      ...(requestConfig?.headers ?? {})
    }
  }

  switch (data.methodType) {
    case '单个视频作品数据': {
      const body = kuaishouApiUrls.单个作品信息({ photoId: data.photoId })
      const VideoData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: body.url,
        data: body.body
      })
      return VideoData
    }

    case '评论数据': {
      const body = kuaishouApiUrls.作品评论信息({ photoId: data.photoId })
      const VideoData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: body.url,
        data: body.body
      })
      return VideoData
    }

    case 'Emoji数据': {
      const body = kuaishouApiUrls.表情()
      const EmojiData = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: body.url,
        data: body.body
      })
      return EmojiData
    }

    default:
      logger.warn(`未知的快手数据接口：「${logger.red((data as any).methodType)}」`)
      return null
  }
}

/**
 * 数据获取函数
 * @param options - 网络请求配置选项
 */
const GlobalGetData = async (type: string, options: AxiosRequestConfig): Promise<any | ErrorDetail> => {
  let warningMessage = ''
  try {
    const result = await fetchData(options)

    if (result === '' || !result || result.result === 2) {
      const Err: ErrorDetail & { requestBody: string } = {
        errorDescription: '获取响应数据失败！接口返回内容为空！',
        requestType: type ?? '未知请求类型',
        requestUrl: options.url!,
        requestBody: JSON.stringify(options.data)
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow('接口返回内容为空，你的快手ck可能已经失效！')}
      请求类型：「${type}」
      请求URL：${options.url}
      请求参数：${JSON.stringify(options.data, null, 2)}
      `
      logger.warn(warningMessage)
      const cookieError = new Error(Err.errorDescription)
      Object.assign(cookieError, {
        code: kuaishouAPIErrorCode.COOKIE,
        data: result,
        amagiError: Err
      })
      throw cookieError
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
        requestUrl: options.url
      },
      amagiMessage: warningMessage
    }
  }
}
