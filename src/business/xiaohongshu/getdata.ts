import { XiaohongshuAPI } from 'amagi/business/xiaohongshu'
import { XiaohongshuDataType, XiaoHongShuOptionsType } from 'amagi/types'
import { Networks, logger } from 'amagi/model'

export default class XiaohongshuData {
  type: any
  headers: any
  obj: any
  constructor (type: keyof typeof XiaohongshuDataType) {
    this.type = type
    this.headers.Referer = 'https://www.xiaohongshu.com/'
    this.headers['Content-Type'] = 'application/json'
  }

  /**
   *
   * @param {any} data param
   * @returns
   */
  async GetData (data = {} as XiaoHongShuOptionsType) {
    switch (this.type) {
      case '单个作品信息': {
        this.obj = XiaohongshuAPI.单个笔记({ source_note_id: data.source_note_id })
        const VideoData = await this.GlobalGetData(
          {
            url: this.obj.url,
            method: 'POST',
            headers: this.headers,
            body: this.obj.body
          }
        )
      }

      default:
        break
    }

  }

  /**
   * @param {*} options opt
   * @returns
   */
  async GlobalGetData (options: { url: any; method?: string; headers?: any; body?: any }) {
    const result = await new Networks(options).getData()
    if (!result || result === '') {
      logger.error('获取响应数据失败！\n请求类型：' + this.type + '\n请求URL：' + options.url)
    }
    return result
  }
}