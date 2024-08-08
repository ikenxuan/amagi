import { DouyinAPI, Sign } from 'amagi/business/douyin'
import { Networks } from 'amagi/model'
import { DouyinDataType, DouyinOptionsType, NetworksConfigType } from 'amagi/types'

export default class DouyinData {
  type: DouyinDataType
  headers: any
  URL: string | undefined
  constructor (type: DouyinDataType, cookie: string) {
    this.type = type
    this.headers = {
      Referer: 'https://www.douyin.com/',
      Cookie: cookie,
      Accept: '*/*',
      'Content-Type': 'application/json',
      'Accpet-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0'
    }
  }

  async GetData(data: DouyinOptionsType = {} as DouyinOptionsType): Promise<any> {
    switch (this.type) {
      case 'VideoData':
      case 'NoteData':
        this.URL = DouyinAPI.视频或图集({ aweme_id: data.aweme_id as string })
        const VideoData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          method: 'GET',
          headers: this.headers
        })
        return VideoData

      case 'CommentData':
        this.URL = DouyinAPI.评论({ aweme_id: data.aweme_id as string })
        const CommentsData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
        return CommentsData

      case 'CommentReplyData':
        this.URL = DouyinAPI.二级评论({ aweme_id: data.aweme_id as string, comment_id: data.comment_id as string })
        const CommentReplyData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
        return CommentReplyData

      case 'UserInfoData':
        this.URL = DouyinAPI.用户主页信息({ sec_uid: data.sec_uid as string })
        const UserInfoData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        })
        return UserInfoData

      case 'EmojiData':
        this.URL = DouyinAPI.表情()
        const EmojiData = await this.GlobalGetData({
          url: this.URL,
          headers: this.headers
        })
        return EmojiData

      case 'UserVideosListData':
        this.URL = DouyinAPI.用户主页视频({ sec_uid: data.sec_uid as string })
        const UserVideoListData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        })
        return UserVideoListData

      case 'SuggestWordsData':
        this.URL = DouyinAPI.热点词({ query: data.query as string })
        const SuggestWordsData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          }
        })
        return SuggestWordsData

      case 'SearchData':
        this.URL = DouyinAPI.搜索({ query: data.query as string })
        const SearchData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          }
        })
        return SearchData

      case 'ExpressionPlusData':
        this.URL = DouyinAPI.互动表情()
        const ExpressionPlusData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
        return ExpressionPlusData

      case 'MusicData':
        this.URL = DouyinAPI.背景音乐({ music_id: data.music_id as string })
        const MusicData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
        return MusicData

      default:
        break
    }
  }

  async GlobalGetData (options: NetworksConfigType) {
    const ResponseData = await new Networks(options).getData()
    return ResponseData
  }
}
