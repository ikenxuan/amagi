import { Networks, logger } from 'amagi/model'
/**
 * 快手数据获取模块
 * 
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/kuaishou → DataFetchers
 */
import { kuaishouApiUrls } from './API'
import { KuaishouDataOptionsMap, NetworksConfigType } from 'amagi/types'
import { amagiAPIErrorCode, ErrorDetail, kuaishouAPIErrorCode } from 'amagi/types/NetworksConfigType'
import { RawAxiosResponseHeaders } from 'axios'

interface CustomHeaders extends RawAxiosResponseHeaders {
  referer?: string
}

const defheaders: CustomHeaders = {
  referer: 'https://www.kuaishou.com/new-reco',
  origin: 'https://www.kuaishou.com',
  accept: '*/*',
  'content-type': 'application/json',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
}

export const KuaishouData = async <T extends keyof KuaishouDataOptionsMap> (
  data: KuaishouDataOptionsMap[T]['opt'],
  cookie?: string
) => {
  const headers = {
    ...defheaders,
    cookie: cookie ? cookie.replace(/\s+/g, '') : ''
  }
  switch (data.methodType) {
    case '单个视频作品数据': {
      const body = kuaishouApiUrls.单个作品信息({ photoId: data.photoId })
      const VideoData = await GlobalGetData({
        url: body.url,
        method: 'POST',
        headers,
        body: body.body,
        ...data
      })
      return VideoData
    }

    case '评论数据': {
      const body = kuaishouApiUrls.作品评论信息({ photoId: data.photoId })
      const VideoData = await GlobalGetData({
        url: body.url,
        method: 'POST',
        headers,
        body: body.body,
        ...data
      })
      return VideoData
    }
    case 'Emoji数据': {
      const body = kuaishouApiUrls.表情()
      const EmojiData = await GlobalGetData({
        url: body.url,
        method: 'POST',
        headers,
        body: body.body,
        ...data
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
const GlobalGetData = async (options: NetworksConfigType): Promise<any | ErrorDetail> => {
  let warningMessage = ''
  try {
    const result = await new Networks(options).getData()

    if (result === '' || !result || result.result === 2) {
      const Err: ErrorDetail & { requestBody: string } = {
        errorDescription: `获取响应数据失败！接口返回内容为空！`,
        requestType: options.methodType ?? '未知请求类型',
        requestUrl: options.url,
        requestBody: JSON.stringify(options.body)
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow('接口返回内容为空，你的快手ck可能已经失效！')}
      请求类型：「${options.methodType}」
      请求URL：${options.url}
      请求参数：${JSON.stringify(options.body, null, 2)}
      `
      logger.warn(warningMessage)
      throw {
        code: kuaishouAPIErrorCode.COOKIE,
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
