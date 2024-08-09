import { BilibiliData, GetBilibiliID } from 'amagi/business/bilibili'
import { BilibiliDataType, BilibiliOptionsType, GetDataResponseType } from 'amagi/types'

export default class BilibiliResult {
  type: BilibiliDataType
  cookie: string
  returndata: boolean
  constructor (type: BilibiliDataType, cookie: string, returndata: boolean = false) {
    this.type = type
    this.cookie = cookie
    /** 直接返回数据，不做响应封装 */
    this.returndata = returndata
  }

  async result (options: BilibiliOptionsType = {} as BilibiliOptionsType): Promise<GetDataResponseType> {
    let result: any
    switch (this.type) {
      case BilibiliDataType.用户主页数据:
      case BilibiliDataType.emoji数据:
      case BilibiliDataType.评论数据:
      case BilibiliDataType.番剧下载信息数据:
      case BilibiliDataType.用户主页动态列表数据:
      case BilibiliDataType.动态详情数据:
      case BilibiliDataType.动态卡片数据:
      case BilibiliDataType.直播间信息:
      case BilibiliDataType.直播间初始化信息:
        result = await new BilibiliData(this.type, this.cookie).GetData(options)
        break
      case BilibiliDataType.单个视频作品数据:
      case BilibiliDataType.番剧基本信息数据: {
        const iddata = await GetBilibiliID(options.url as string)
        result = await new BilibiliData(this.type, this.cookie).GetData(iddata)
        break
      }
      default:
        result = ''
        break
    }
    if (this.returndata) return result
    return {
      code: result !== false && result !== '' ? 200 : 503,
      message: result !== !false && result !== '' ? 'success' : 'error',
      data: result !== !false && result !== '' ? result : null
    }
  }
}
