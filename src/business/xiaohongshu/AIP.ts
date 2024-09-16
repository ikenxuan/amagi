import { XiaohongshuDataOptionsMap } from 'amagi/types'
class XiaohongshuAPI {
  单个笔记 (data: XiaohongshuDataOptionsMap['单个笔记']): XiaoHongShuAPIType {
    return {
      url: 'https://edith.xiaohongshu.com/api/sns/web/v1/feed',
      method: 'POST',
      body: {
        source_note_id: data.source_note_id,
        image_formats: ['jpg', 'webp', 'avif'],
        extra: { need_body_topic: 1 },
        xsec_source: 'pc_feed',
        xsec_token: data.xsec_token
      }
    }
  }
}

interface XiaoHongShuAPIType {
  /** 请求地址 */
  url: string,
  /** 请求方法 */
  method: string,
  /** 请求体 */
  body: any
}

export default new XiaohongshuAPI()