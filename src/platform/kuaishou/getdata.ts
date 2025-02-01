import { logger, Networks, validateData } from 'amagi/model'
import { KuaishouAPI } from 'amagi/platform/kuaishou'
import { KuaishouDataOptionsMap, NetworksConfigType } from 'amagi/types'
import { RawAxiosResponseHeaders } from 'axios'

interface CustomHeaders extends RawAxiosResponseHeaders {
  referer?: string
}

const defheaders: CustomHeaders = {
  referer: 'https://www.kuaishou.com/new-reco',
  origin: 'https://www.kuaishou.com',
  accept: '*/*',
  'content-type': 'application/json',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
}

export const KuaishouData = async <T extends keyof KuaishouDataOptionsMap> (
  data: KuaishouDataOptionsMap[T]['opt'],
  cookie?: string
) => {
  const headers = {
    ...defheaders,
    cookie: cookie ? cookie.replace(/\s+/g, '') : ''
  }
  switch (data.methodType) {
    case '单个视频作品数据': {
      validateData(data, ['photoId'])
      const body = KuaishouAPI.单个作品信息({ photoId: data.photoId })
      const VideoData = await GlobalGetData({
        url: body.url,
        method: 'POST',
        headers,
        body: body.body,
        ...data
      })
      return VideoData
    }

    case '评论数据': {
      validateData(data, ['photoId'])
      const body = KuaishouAPI.作品评论信息({ photoId: data.photoId })
      const VideoData = await GlobalGetData({
        url: body.url,
        method: 'POST',
        headers,
        body: body.body,
        ...data
      })
      return VideoData
    }
    case 'Emoji数据': {
      const body = KuaishouAPI.表情()
      const EmojiData = await GlobalGetData({
        url: body.url,
        method: 'POST',
        headers,
        body: body.body,
        ...data
      })
      return EmojiData
    }
    default:
      break
  }
}

async function GlobalGetData (options: NetworksConfigType) {
  const ResponseData = await new Networks(options).getData()
  if (ResponseData.result === 2) {
    logger.warn(`获取响应数据失败！接口返回内容为空\n你的快手ck可能已经失效！\n请求类型：${options.methodType}\n请求URL：${options.url}\n请求参数：${JSON.stringify(options.body, null, 2)}`)
    return false
  }
  return ResponseData
}
