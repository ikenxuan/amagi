import { DouyinData, GetDouyinID } from 'amagi/business/douyin';
import { DouyinDataType, GetDataResponseType, DouyinOptionsType } from 'amagi/types';


export default class DouyinResult {
  type: DouyinDataType
  constructor (type: DouyinDataType) {
    this.type = type
  }

  async result (options: DouyinOptionsType = {} as DouyinOptionsType): Promise<GetDataResponseType> {
    let result: any
    switch (this.type) {
      case 'CommentReplyData':
      case 'UserInfoData':
      case 'UserVideosListData':
      case 'SuggestWordsData':
      case 'SearchData':
      case 'EmojiData':
      case 'ExpressionPlusData':
      case 'MusicData':
      case 'LiveImageData':
        result = await new DouyinData(this.type).GetData(options)
        break
      case 'VideoData':
      case 'NoteData':
      case 'CommentData':
        const defurl = options?.url?.toString().match(/(http|https):\/\/.*\.(douyin|iesdouyin)\.com\/[^ ]+/g)
        const iddata = await GetDouyinID(String(defurl))
        result = await new DouyinData(this.type).GetData(iddata)
        break
      default:
        result = ''
        break
    }
    return {
      code: result !== false && result !== '' ? 200 : 503,
      message: result !== false && result !== '' ? 'success' : 'error',
      data: result !== false && result !== '' ? result : null,
    }
  }
}