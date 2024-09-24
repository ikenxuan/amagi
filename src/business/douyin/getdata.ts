import { DouyinAPI, Sign } from 'amagi/business/douyin'
import { Networks } from 'amagi/model'
import { DouyinDataType, DouyinOptionsType, NetworksConfigType } from 'amagi/types'

export default class DouyinData {
  type: keyof typeof DouyinDataType
  headers: any
  URL: string | undefined
  constructor (type: keyof typeof DouyinDataType, cookie: string | undefined) {
    this.type = type
    this.headers = {
      Referer: 'https://www.douyin.com/',
      Cookie: cookie ? cookie.replace(/\s+/g, '') : '',
      Accept: '*/*',
      'Content-Type': 'application/json',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    }
  }

  async GetData (data = {} as DouyinOptionsType): Promise<any> {
    switch (this.type) {
      case DouyinDataType.单个视频作品数据:
      case DouyinDataType.图集作品数据: {
        this.URL = DouyinAPI.视频或图集({ aweme_id: data.aweme_id as string })
        const VideoData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          method: 'GET',
          headers: this.headers
        })
        return VideoData
      }

      case DouyinDataType.评论数据: {
        this.URL = DouyinAPI.评论({ aweme_id: data.aweme_id as string, number: data.number as number })
        const CommentsData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
        return CommentsData
      }

      case DouyinDataType.二级评论数据: {
        this.URL = DouyinAPI.二级评论({ aweme_id: data.aweme_id as string, comment_id: data.comment_id as string })
        const CommentReplyData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
        return CommentReplyData
      }

      case DouyinDataType.用户主页数据: {
        this.URL = DouyinAPI.用户主页信息({ sec_uid: data.sec_uid as string })
        const UserInfoData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        })
        return UserInfoData
      }

      case DouyinDataType.官方emoji数据: {
        this.URL = DouyinAPI.表情()
        const EmojiData = await this.GlobalGetData({
          url: this.URL,
          headers: this.headers
        })
        return EmojiData
      }

      case DouyinDataType.用户主页视频列表数据: {
        this.URL = DouyinAPI.用户主页视频({ sec_uid: data.sec_uid as string })
        const UserVideoListData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        })
        return UserVideoListData
      }

      case DouyinDataType.热点词数据: {
        this.URL = DouyinAPI.热点词({ query: data.query as string })
        const SuggestWordsData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          }
        })
        return SuggestWordsData
      }

      case DouyinDataType.搜索数据: {
        this.URL = DouyinAPI.搜索({ query: data.query as string })
        const SearchData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          }
        })
        return SearchData
      }

      case DouyinDataType.动态表情数据: {
        this.URL = DouyinAPI.互动表情()
        const ExpressionPlusData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
        return ExpressionPlusData
      }

      case DouyinDataType.音乐数据: {
        this.URL = DouyinAPI.背景音乐({ music_id: data.music_id as string })
        const MusicData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
        return MusicData
      }

      case DouyinDataType.实况图片图集数据: {
        this.URL = DouyinAPI.动图({ aweme_id: data.aweme_id as string })
        const LiveImages = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/126.0.0.0'
          }
        })
        return LiveImages
      }

      case DouyinDataType.直播间信息数据: {
        this.URL = DouyinAPI.用户主页信息({ sec_uid: data.sec_uid as string })
        const UserInfoData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        })
        if (UserInfoData.user.live_status !== 1) throw new Error(UserInfoData.user.nickname + '未开启直播！')
        const room_data = JSON.parse(UserInfoData.user.room_data)
        this.URL = DouyinAPI.直播间信息({ room_id: UserInfoData.user.room_id_str as string, web_rid: room_data.owner.web_rid as string })
        const LiveRoomData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://live.douyin.com/${room_data.owner.web_rid}`
          }
        })
        return LiveRoomData
      }

      case DouyinDataType.申请二维码数据: {
        this.URL = DouyinAPI.申请二维码({ verify_fp: data.verify_fp as string })
        const LoginQrcodeStatusData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${Sign.AB(this.URL)}`,
          headers: this.headers
        })
      }

      default:
        break
    }
  }

  async GlobalGetData (options: NetworksConfigType) {
    const ResponseData = await new Networks(options).getData()
    if (ResponseData === '') {
      throw new Error('获取响应数据失败！抖音ck可能已经失效！\n请求类型：' + this.type + '\n请求URL：' + options.url)
    }
    return ResponseData
  }
}
