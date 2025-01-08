import { logger, Networks, validateData } from 'amagi/model'
import { douyinAPI, douyinSign } from 'amagi/platform/douyin'
import { DouyinDataOptionsMap, NetworksConfigType } from 'amagi/types'
import { RawAxiosResponseHeaders } from 'axios'

interface CustomHeaders extends RawAxiosResponseHeaders {
  referer?: string
}

const defheaders: CustomHeaders = {
  accept: '*/*',
  priority: 'u=0, i',
  'content-type': 'application/json',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  referer: 'https://www.douyin.com/'
}

export const DouyinData = async <T extends keyof DouyinDataOptionsMap> (
  data: DouyinDataOptionsMap[T],
  cookie?: string
) => {
  const headers = {
    ...defheaders,
    cookie: cookie ? cookie.replace(/\s+/g, '') : ''
  }

  switch (data.methodType) {
    case '单个视频作品数据':
    case '图集作品数据': {
      validateData(data, ['aweme_id'])
      const url = douyinAPI.视频或图集({ aweme_id: data.aweme_id })
      const VideoData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return VideoData
    }

    case '评论数据': {
      validateData(data, ['aweme_id'])
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
        const response = await GlobalGetData({
          url: `${url}&a_bogus=${douyinSign.AB(url)}`,
          headers,
          ...data
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
      validateData(data, ['aweme_id', 'comment_id'])
      const url = douyinAPI.二级评论({ aweme_id: data.aweme_id, comment_id: data.comment_id })
      const CommentReplyData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return CommentReplyData
    }

    case '用户主页数据': {
      validateData(data, ['sec_uid'])
      const url = douyinAPI.用户主页信息({ sec_uid: data.sec_uid })
      const UserInfoData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://www.douyin.com/user/${data.sec_uid}`
        },
        ...data
      })
      return UserInfoData
    }

    case 'Emoji数据': {
      const url = douyinAPI.表情()
      const EmojiData = await GlobalGetData({
        url,
        headers,
        ...data
      })
      return EmojiData
    }

    case '用户主页视频列表数据': {
      validateData(data, ['sec_uid'])
      const url = douyinAPI.用户主页视频({ sec_uid: data.sec_uid })
      const UserVideoListData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://www.douyin.com/user/${data.sec_uid}`
        },
        ...data
      })
      return UserVideoListData
    }

    case '热点词数据': {
      validateData(data, ['query'])
      const url = douyinAPI.热点词({ query: data.query, number: data.number ?? 10 })
      const SuggestWordsData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
        },
        ...data
      })
      return SuggestWordsData
    }

    case '搜索数据': {
      validateData(data, ['query'])
      let search_id = ''
      const maxPageSize = 15 // 接口单次请求的最大评论数量
      let fetchedSearchList: any[] = [] // 用于存储实际获取的所有评论
      let tmpresp: any = {}

      // 循环直到获取到足够数量的评论
      while (fetchedSearchList.length < Number(data.number ?? 10)) {
        // 计算本次请求需要获取的评论数量，确保不超过剩余需要获取的数量
        const requestCount = Math.min(Number(data.number ?? 50) - fetchedSearchList.length, maxPageSize)

        // 构建请求URL
        const url = douyinAPI.搜索({
          query: data.query,
          number: requestCount,
          search_id: search_id === '' ? undefined : search_id
        })

        // 发起请求获取评论数据
        const response = await GlobalGetData({
          url: `${url}&a_bogus=${douyinSign.AB(url)}`,
          headers: {
            ...headers,
            Referer: `https://www.douyin.com/search/${encodeURIComponent(String(data.query))}`
          },
          ...data
        })
        if (!response.data) {
          response.data = []
        }
        // 将获取到的评论数据添加到数组中
        fetchedSearchList.push(...response.data)

        // 更新tmpresp为最后一次请求的响应
        tmpresp = response

        // 更新游标值，准备下一次请求
        search_id = response.log_pb.impr_id
      }

      // 使用最后一次请求的接口响应格式，替换其中的评论数据
      const finalResponse = {
        ...tmpresp,
        data: data.number === 0 ? [] : fetchedSearchList.slice(0, Number(data.number ?? 10))
      }
      return finalResponse
    }

    case '动态表情数据': {
      const url = douyinAPI.互动表情()
      const ExpressionPlusData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return ExpressionPlusData
    }

    case '音乐数据': {
      validateData(data, ['music_id'])
      const url = douyinAPI.背景音乐({ music_id: data.music_id })
      const MusicData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return MusicData
    }

    case '合辑作品数据': {
      validateData(data, ['aweme_id'])
      const url = douyinAPI.动图({ aweme_id: data.aweme_id })
      const LiveImages = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/126.0.0.0'
        },
        ...data
      })
      return LiveImages
    }

    case '直播间信息数据': {
      validateData(data, ['sec_uid'])
      let url = douyinAPI.用户主页信息({ sec_uid: data.sec_uid })
      const UserInfoData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://www.douyin.com/user/${data.sec_uid}`
        },
        ...data
      })
      if (UserInfoData.user.live_status !== 1) logger.error(UserInfoData.user.nickname + '未开启直播！')
      if (!UserInfoData.user.room_data) {
        logger.error('未获取到直播间信息！')
        return {
          code: 500,
          message: '未获取到直播间信息！',
          data: null
        }
      }
      const room_data = JSON.parse(UserInfoData.user.room_data)
      url = douyinAPI.直播间信息({ room_id: UserInfoData.user.room_id_str as string, web_rid: room_data.owner.web_rid as string })
      const LiveRoomData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers: {
          ...headers,
          Referer: `https://live.douyin.com/${room_data.owner.web_rid}`
        },
        ...data
      })
      return LiveRoomData
    }

    case '申请二维码数据': {
      validateData(data, ['verify_fp'])
      const url = douyinAPI.申请二维码({ verify_fp: data.verify_fp })
      const LoginQrcodeStatusData = await GlobalGetData({
        url: `${url}&a_bogus=${douyinSign.AB(url)}`,
        headers,
        ...data
      })
      return LoginQrcodeStatusData
    }

    default:
      break
  }
}

async function GlobalGetData (options: NetworksConfigType) {
  const ResponseData = await new Networks(options).getData()
  if (ResponseData === '' || !ResponseData) {
    logger.warn('获取响应数据失败！接口返回内容为空\n你的抖音ck可能已经失效！\n请求类型：' + options.methodType + '\n请求URL：' + options.url)
    return false
  }
  return ResponseData
}