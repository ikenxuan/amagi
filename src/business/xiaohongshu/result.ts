import { XiaohongshuData } from 'amagi/business/xiaohongshu'
import { XiaohongshuDataType, XiaohongshuOptionsType, GetDataResponseType } from 'amagi/types'
interface configParams {
  /** 请求数据的类型 */
  type: keyof typeof XiaohongshuDataType
  /** 小红书用户ck */
  cookie: string
}
export default async function XiaohongshuResult (
  config: configParams = { cookie: '' } as configParams,
  options = {} as XiaohongshuOptionsType
): Promise<GetDataResponseType> {
  let result: any
  switch (config.type) {
    case XiaohongshuDataType.单个笔记: {
      result = await new XiaohongshuData(config.type, config.cookie).GetData(options)
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