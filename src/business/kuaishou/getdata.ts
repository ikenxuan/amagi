import { KuaishouAPI } from 'amagi/business/kuaishou'
import { logger, Networks } from 'amagi/model'
import { KuaishouDataType, KuaishouOptionsType, NetworksConfigType } from 'amagi/types'

export class KuaishouData {
  type: keyof typeof KuaishouDataType
  headers: any
  constructor (type: keyof typeof KuaishouDataType, cookie: string | undefined) {
    this.type = type
    this.headers = {
      Referer: 'https://www.kuaishou.com/new-reco',
      Cookie: cookie ? cookie.replace(/\s+/g, '') : '',
      Origin: 'https://www.kuaishou.com',
      Accept: '*/*',
      'Content-Type': 'application/json',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
    }
  }

  async GetData (data = {} as KuaishouOptionsType): Promise<any> {
    switch (this.type) {
      case '单个视频作品数据': {
        const body = KuaishouAPI.单个作品信息({ photoId: data.photoId as string })
        const VideoData = await this.GlobalGetData({
          url: body.url,
          method: 'POST',
          headers: this.headers,
          body: body.body
        })
        return VideoData
      }

      case '评论数据': {
        const body = KuaishouAPI.作品评论信息({ photoId: data.photoId as string })
        const VideoData = await this.GlobalGetData({
          url: body.url,
          method: 'POST',
          headers: this.headers,
          body: body.body
        })
        return VideoData
      }
      case 'Emoji数据': {
        const body = KuaishouAPI.表情()
        const EmojiData = await this.GlobalGetData({
          url: body.url,
          method: 'POST',
          headers: this.headers,
          body: body.body
        })
        return EmojiData
      }
      default:
        break
    }
  }

  async GlobalGetData (options: NetworksConfigType) {
    const ResponseData = await new Networks(options).getData()
    if (ResponseData.result === 2) {
      logger.warn('获取响应数据失败！接口返回内容为空\n你的快手ck可能已经失效！\n请求类型：' + this.type + '\n请求URL：' + options.url)
      return false
    }
    return ResponseData
  }
}
