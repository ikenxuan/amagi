import { XiaohongshuAPI } from 'amagi/business/xiaohongshu'
import { XiaohongshuDataType, XiaohongshuOptionsType } from 'amagi/types'
import { Networks, logger } from 'amagi/model'
import { Sign } from 'amagi/business/xiaohongshu'

export default class XiaohongshuData {
  type: any
  headers: any
  constructor (type: keyof typeof XiaohongshuDataType, cookie: string) {
    this.type = type
    this.headers = headers
    this.headers.cookie = cookie
  }

  async GetData (data = {} as XiaohongshuOptionsType): Promise<any> {
    switch (this.type) {
      case XiaohongshuDataType.单个笔记: {
        const API = XiaohongshuAPI.单个笔记({ source_note_id: data.source_note_id as string, xsec_token: data.xsec_token || 'xsec_token' })
        const WorkData = await this.GlobalGetData(
          {
            url: API.url,
            method: 'POST',
            headers: {
              ...this.headers,
              'x-s': Sign.x_s(API.url, this.headers.cookie),
              'x-b3-traceid': Sign.x_b3_traceid(),
              'x-s-common': Sign.x_s_common({ x_s: Sign.x_s(API.url, this.headers.cookie), a1: '18ee0b8eaa14szquw6otb9amxbdj35n5nrhcpqi4j50000360507' })
            },
            body: API.body
          }
        )
        return WorkData
      }

      default:
        break
    }

  }

  async GlobalGetData (options: { url: string, method?: string, headers?: any; body?: any }) {
    const result = await new Networks(options).getData()
    if (!result || result === '') {
      logger.error('获取响应数据失败！\n请求类型：' + this.type + '\n请求URL：' + options.url)
    }
    return result
  }
}

const headers = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9',
  'content-type': 'application/json;charset=UTF-8',
  'origin': 'https://www.xiaohongshu.com',
  'priority': 'u=1, i',
  'referer': 'https://www.xiaohongshu.com/',
  'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
}