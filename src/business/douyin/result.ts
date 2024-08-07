import { DouyinData, GetDouyinID } from 'amagi/business/douyin'
import { DouyinDataType, DouyinOptionsType, GetDataResponseType } from 'amagi/types'


export default class DouyinResult {
  type: DouyinDataType
  cookie: string
  returndata: boolean
  constructor (type: DouyinDataType, cookie: string, returndata: boolean = true) {
    this.type = type
    this.cookie = cookie
    /** 直接返回数据，不做响应封装 */
    this.returndata = returndata
  }

  async result (options: DouyinOptionsType = {} as DouyinOptionsType): Promise<GetDataResponseType> {
    let result: any
    switch (this.type) {
      case DouyinDataType.二级评论数据:
      case DouyinDataType.用户主页数据:
      case DouyinDataType.用户主页视频列表数据:
      case DouyinDataType.热点词数据:
      case DouyinDataType.搜索数据:
      case DouyinDataType.官方emoji数据:
      case DouyinDataType.动态表情数据:
      case DouyinDataType.音乐数据:
      case DouyinDataType.实况图片图集数据:
        result = await new DouyinData(this.type, this.cookie).GetData(options)
        break
      case DouyinDataType.单个视频作品数据:
      case DouyinDataType.图集作品数据:
      case DouyinDataType.评论数据: {
        const defurl = options?.url?.toString().match(/(http|https):\/\/.*\.(douyin|iesdouyin)\.com\/[^ ]+/g)
        const iddata = await GetDouyinID(String(defurl))
        result = await new DouyinData(this.type, this.cookie).GetData(iddata)
        break
      }
      default:
        result = ''
        break
    }
    if (this.returndata) return result
    return {
      code: result !== false && result !== '' ? 200 : 503,
      message: result !== false && result !== '' ? 'success' : 'error',
      data: result !== false && result !== '' ? result : null
    }
  }
}
