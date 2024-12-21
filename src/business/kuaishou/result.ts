import { KuaishouData } from 'amagi/business/kuaishou'
import { GetDataResponseType, KuaishouDataType, KuaishouOptionsType } from 'amagi/types'

interface configParams {
  /** 请求数据的类型 */
  type: keyof typeof KuaishouDataType
  /** 快手用户ck */
  cookie: string | undefined
}

export async function kuaishouResult (
  config: configParams = { cookie: '' } as configParams,
  options = {} as KuaishouOptionsType): Promise<GetDataResponseType> {
  let result: any
  switch (config.type) {
    case KuaishouDataType.Emoji数据:
    case KuaishouDataType.评论数据:
    case KuaishouDataType.单个视频作品数据: {
      result = await new KuaishouData(config.type, config.cookie).GetData(options)
      break
    }
    default:
      result = ''
      break
  }
  return {
    code: result !== false && result !== '' ? 200 : 503,
    message: result !== false && result !== '' ? 'success' : 'error',
    data: result !== false && result !== '' ? result : null
  }
}
