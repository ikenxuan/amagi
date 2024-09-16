import { XiaohongshuAPI } from 'amagi/business/xiaohongshu'
import { XiaohongshuDataType, XiaohongshuOptionsType } from 'amagi/types'
import { Networks, logger } from 'amagi/model'

export default class XiaohongshuData {
  type: any
  headers: any
  constructor (type: keyof typeof XiaohongshuDataType) {
    this.type = type
    this.headers.Referer = 'https://www.xiaohongshu.com/'
    this.headers['Content-Type'] = 'application/json'
  }

  async GetData (data = {} as XiaohongshuOptionsType): Promise<any> {
    switch (this.type) {
      case '单个作品信息': {
        const AIP = XiaohongshuAPI.单个笔记({ source_note_id: data.source_note_id as string, xsec_token: data.xsec_token || 'xsec_token' })
        const WorkData = await this.GlobalGetData(
          {
            url: AIP.url,
            method: 'POST',
            headers: this.headers,
            body: AIP.body
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