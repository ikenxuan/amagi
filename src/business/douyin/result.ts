import { DouyinData, getDouyinID } from 'amagi/business/douyin'
import { DouyinDataType, DouyinOptionsType, GetDataResponseType } from 'amagi/types'
interface configParams {
  /** 请求数据的类型 */
  type: keyof typeof DouyinDataType
  /** 抖音用户ck */
  cookie: string | undefined
}
export async function douyinResult (
  config: configParams = { cookie: '' } as configParams,
  options = {} as DouyinOptionsType): Promise<GetDataResponseType> {
  let result: any
  switch (config.type) {
    case DouyinDataType.二级评论数据:
    case DouyinDataType.用户主页数据:
    case DouyinDataType.用户主页视频列表数据:
    case DouyinDataType.热点词数据:
    case DouyinDataType.搜索数据:
    case DouyinDataType.Emoji数据:
    case DouyinDataType.动态表情数据:
    case DouyinDataType.音乐数据:
    case DouyinDataType.直播间信息数据:
    case DouyinDataType.申请二维码数据: {
      result = await new DouyinData(config.type, config.cookie).GetData(options)
      break
    }
    case DouyinDataType.评论数据: {
      if (!options?.url) {
        result = await new DouyinData(config.type, config.cookie).GetData(options)
      } else {
        const iddata = await getDouyinID(String(options.url))
        result = await new DouyinData(config.type, config.cookie).GetData({ ...options, ...iddata })
      }
      break
    }
    case DouyinDataType.实况图片图集数据:
    case DouyinDataType.单个视频作品数据:
    case DouyinDataType.图集作品数据: {
      if (!options?.url) {
        result = await new DouyinData(config.type, config.cookie).GetData(options)
      } else {
        const iddata = await getDouyinID(String(options.url))
        result = await new DouyinData(config.type, config.cookie).GetData({ ...options, ...iddata })
      }
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
