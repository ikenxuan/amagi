import { BilibiliData, GetBilibiliID } from 'amagi/business/bilibili'
import { BilibiliDataType, BilibiliOptionsType, GetDataResponseType } from 'amagi/types'


interface configParams {
  /** 请求数据的类型 */
  type: keyof typeof BilibiliDataType
  /** B站用户ck */
  cookie: string
}

/**
 * 
 * @param options 
 * @param config 
 * @returns 
 */
export default async function BilibiliResult (
  config: configParams = { cookie: '' } as configParams,
  options: BilibiliOptionsType): Promise<GetDataResponseType | any> {
  let data: string
  switch (config.type) {
    case BilibiliDataType.用户主页数据:
    case BilibiliDataType.emoji数据:
    case BilibiliDataType.评论数据:
    case BilibiliDataType.番剧下载信息数据:
    case BilibiliDataType.用户主页动态列表数据:
    case BilibiliDataType.动态详情数据:
    case BilibiliDataType.动态卡片数据:
    case BilibiliDataType.直播间信息:
    case BilibiliDataType.直播间初始化信息:
    case BilibiliDataType.二维码状态:
    case BilibiliDataType.申请二维码:
    case BilibiliDataType.登录基本信息:
      data = await new BilibiliData(config.type, config.cookie).GetData(options)
      break
    case BilibiliDataType.单个视频下载信息数据: {
      const iddata = await GetBilibiliID(options.url as string)
      const infoData = await new BilibiliData(BilibiliDataType.单个视频作品数据, config.cookie).GetData(iddata)
      data = await new BilibiliData(config.type, config.cookie).GetData({ avid: infoData.data.aid, cid: infoData.data.cid })
      break
    }
    case BilibiliDataType.单个视频作品数据: {
      const iddata = await GetBilibiliID(options.url as string)
      data = await new BilibiliData(config.type, config.cookie).GetData(iddata)
      break
    }
    case BilibiliDataType.番剧基本信息数据: {
      const hasid = options.id || null
      if (hasid) {
        data = await new BilibiliData(config.type, config.cookie).GetData({ id: options.id })
      } else {
        const iddata = await GetBilibiliID(options.url as string)
        data = await new BilibiliData(config.type, config.cookie).GetData(iddata)
      }
      break
    }
    default:
      data = ''
      break
  }
  return {
    code: data !== '' ? 200 : 503,
    message: data !== '' ? 'success' : 'error',
    data: data !== '' ? data : null
  }
}