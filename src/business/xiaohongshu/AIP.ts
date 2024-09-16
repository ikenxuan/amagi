import { XiaohongshuDataOptionsMap } from 'amagi/types'
class XiaohongshuAPI {
  单个笔记 (data: XiaohongshuDataOptionsMap['单个笔记']): XiaoHongShuAPI {
    return {
      url: 'https://www.kuaishou.com/graphql',
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

interface XiaoHongShuAPI {
  url: string,
  method: string,
  body: any
}

export default new XiaohongshuAPI()