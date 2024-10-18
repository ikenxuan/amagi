import { BilibiliData, GetBilibiliID, av2bv, bv2av } from 'amagi/business/bilibili'
import { BilibiliDataType, BilibiliOptionsType, GetDataResponseType } from 'amagi/types'


interface configParams {
  /** 请求数据的类型 */
  type: keyof typeof BilibiliDataType
  /** B站用户ck */
  cookie: string | undefined
}

/**
 * 
 * @param options 
 * @param config 
 * @returns 
 */
export default async function BilibiliResult (
  config = { cookie: '' } as configParams,
  options?: BilibiliOptionsType): Promise<GetDataResponseType | any> {
  let data: any
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
    case BilibiliDataType.登录基本信息: {
      data = await new BilibiliData(config.type, config.cookie as string).GetData(options)
      break
    }
    case BilibiliDataType.单个视频下载信息数据: {
      if (!options?.url) {
        data = await new BilibiliData(config.type, config.cookie as string).GetData(options)
      } else {
        const iddata = await GetBilibiliID(options?.url as string)
        const infoData = await new BilibiliData(BilibiliDataType.单个视频作品数据, config.cookie as string).GetData(iddata)
        data = await new BilibiliData(config.type, config.cookie as string).GetData({ avid: infoData.data.aid, cid: infoData.data.cid })

      }
      break
    }
    case BilibiliDataType.单个视频作品数据: {
      if (!options?.url) {
        data = await new BilibiliData(config.type, config.cookie as string).GetData(options)
      } else {
        const iddata = await GetBilibiliID(options?.url as string)
        data = await new BilibiliData(config.type, config.cookie as string).GetData(iddata)
      }
      break
    }
    case BilibiliDataType.番剧基本信息数据: {
      const hasid = options?.ep_id || options?.season_id
      const id = options?.hasOwnProperty('ep_id') ? { ep_id: options?.ep_id } : { season_id: options?.season_id } as BilibiliOptionsType
      const ivad = Object.keys(id)[0]
      const values = Object.values(id)[0]
      if (hasid) {
        data = await new BilibiliData(config.type, config.cookie as string).GetData({ [ivad]: values })
      } else {
        const iddata = await GetBilibiliID(options?.url as string)
        data = await new BilibiliData(config.type, config.cookie as string).GetData(iddata)
      }
      break
    }
    case 'AV转BV': {
      const replaceavid = options?.avid?.toString() ? (options?.avid?.toString() as string).replace(/^av/i, '') : ''
      data = av2bv(Number(replaceavid))
      break
    }
    case 'BV转AV': {
      const bvid = options?.bvid || ''
      data = 'av' + bv2av(bvid)
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