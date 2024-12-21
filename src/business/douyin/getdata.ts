import { douyinAPI, douyinSign } from 'amagi/business/douyin'
import { logger, Networks } from 'amagi/model'
import { DouyinDataType, DouyinOptionsType, NetworksConfigType } from 'amagi/types'

export class DouyinData {
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
      case '单个视频作品数据':
      case '图集作品数据': {
        this.URL = douyinAPI.视频或图集({ aweme_id: data.aweme_id as string })
        const VideoData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          method: 'GET',
          headers: this.headers
        })
        return VideoData
      }

      case '评论数据': {
        let cursor = data.cursor ?? 0 // 初始游标值
        const maxPageSize = 50 // 接口单次请求的最大评论数量
        let fetchedComments: any[] = [] // 用于存储实际获取的所有评论
        let tmpresp: any = {}

        // 循环直到获取到足够数量的评论
        while (fetchedComments.length < Number(data.number ?? 50)) {
          // 计算本次请求需要获取的评论数量，确保不超过剩余需要获取的数量
          const requestCount = Math.min(Number(data.number ?? 50) - fetchedComments.length, maxPageSize)

          // 构建请求URL
          const url = douyinAPI.评论({
            aweme_id: data.aweme_id,
            number: requestCount,
            cursor
          })

          // 发起请求获取评论数据
          const response = await this.GlobalGetData({
            url: `${url}&a_bogus=${douyinSign.AB(url)}`,
            headers: this.headers
          })
          if (!response.comments) {
            response.comments = []
          }
          // 将获取到的评论数据添加到数组中
          fetchedComments.push(...response.comments)

          // 更新tmpresp为最后一次请求的响应
          tmpresp = response

          // 如果本次请求的评论数量小于请求的数量，说明已经没有更多评论了
          if (response.comments.length < requestCount) {
            break
          }

          // 更新游标值，准备下一次请求
          cursor = response.cursor
        }

        // 使用最后一次请求的接口响应格式，替换其中的评论数据
        const finalResponse = {
          ...tmpresp,
          comments: data.number === 0 ? [] : fetchedComments.slice(0, Number(data.number ?? 50)),
          cursor: data.number === 0 ? 0 : fetchedComments.length
        }
        return finalResponse
      }

      case '二级评论数据': {
        this.URL = douyinAPI.二级评论({ aweme_id: data.aweme_id as string, comment_id: data.comment_id as string })
        const CommentReplyData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: this.headers
        })
        return CommentReplyData
      }

      case '用户主页数据': {
        this.URL = douyinAPI.用户主页信息({ sec_uid: data.sec_uid as string })
        const UserInfoData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        })
        return UserInfoData
      }

      case 'Emoji数据': {
        this.URL = douyinAPI.表情()
        const EmojiData = await this.GlobalGetData({
          url: this.URL,
          headers: this.headers
        })
        return EmojiData
      }

      case '用户主页视频列表数据': {
        this.URL = douyinAPI.用户主页视频({ sec_uid: data.sec_uid as string })
        const UserVideoListData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        })
        return UserVideoListData
      }

      case '热点词数据': {
        this.URL = douyinAPI.热点词({ query: data.query as string })
        const SuggestWordsData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          }
        })
        return SuggestWordsData
      }

      case '搜索数据': {
        this.URL = douyinAPI.搜索({ query: data.query as string })
        const SearchData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          }
        })
        return SearchData
      }

      case '动态表情数据': {
        this.URL = douyinAPI.互动表情()
        const ExpressionPlusData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: this.headers
        })
        return ExpressionPlusData
      }

      case '音乐数据': {
        this.URL = douyinAPI.背景音乐({ music_id: data.music_id as string })
        const MusicData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: this.headers
        })
        return MusicData
      }

      case '实况图片图集数据': {
        this.URL = douyinAPI.动图({ aweme_id: data.aweme_id as string })
        const LiveImages = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/126.0.0.0'
          }
        })
        return LiveImages
      }

      case '直播间信息数据': {
        this.URL = douyinAPI.用户主页信息({ sec_uid: data.sec_uid as string })
        const UserInfoData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://www.douyin.com/user/${data.sec_uid}`
          }
        })
        if (UserInfoData.user.live_status !== 1) logger.error(UserInfoData.user.nickname + '未开启直播！')
        const room_data = JSON.parse(UserInfoData.user.room_data)
        this.URL = douyinAPI.直播间信息({ room_id: UserInfoData.user.room_id_str as string, web_rid: room_data.owner.web_rid as string })
        const LiveRoomData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: {
            ...this.headers,
            Referer: `https://live.douyin.com/${room_data.owner.web_rid}`
          }
        })
        return LiveRoomData
      }

      case '申请二维码数据': {
        this.URL = douyinAPI.申请二维码({ verify_fp: data.verify_fp as string })
        const LoginQrcodeStatusData = await this.GlobalGetData({
          url: `${this.URL}&a_bogus=${douyinSign.AB(this.URL)}`,
          headers: this.headers
        })
        return LoginQrcodeStatusData
      }

      default:
        break
    }
  }

  async GlobalGetData (options: NetworksConfigType) {
    const ResponseData = await new Networks(options).getData()
    if (ResponseData === '') {
      logger.warn('获取响应数据失败！接口返回内容为空\n你的抖音ck可能已经失效！\n请求类型：' + this.type + '\n请求URL：' + options.url)
      return false
    }
    return ResponseData
  }
}
