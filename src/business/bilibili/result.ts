import { BilibiliData, GetBilibiliID } from 'amagi/business/bilibili';
import { BilibiliDataType, GetDataResponseType, BilibiliOptionsType } from 'amagi/types';


export default class BilibiliResult {
  type: BilibiliDataType
  constructor (type: BilibiliDataType) {
    this.type = type
  }

  async result (options: BilibiliOptionsType = {} as BilibiliOptionsType): Promise<GetDataResponseType> {
    let result: any
    switch (this.type) {
      case 'UserInfoData':
      case 'SearchData':
      case 'EmojiData':
        result = await new BilibiliData(this.type).GetData(options)
        break
      case 'VideoData':
      case 'CommentData':
        const iddata = await GetBilibiliID(String(options.url))
        result = await new BilibiliData(this.type).GetData(iddata)
        break
      default:
        result = ''
        break
    }
    return {
      code: result !== false && result !== '' ? 200 : 503,
      message: result !== !false && result !== '' ? 'success' : 'error',
      data: result !== !false && result !== '' ? result : null,
    }
  }
}