import { logger, Networks } from 'amagi/model'
import { BilibiliDataType } from 'amagi/types'


interface IDDataTypes {
  /**
   * 类型
   */
  type: BilibiliDataType
  /**
   * 作品ID、BV号、AV号
   */
  id?: string
  /**
   * 动态ID、
   */
  dynamic_id?: string
  /**
   * 用户UID
   */
  host_mid?: string
}

/**
 * return aweme_id
 * @param {string} url 分享连接
 * @returns
 */
export default async function GetBilibiliID (url: string): Promise<IDDataTypes> {
  const longLink = await new Networks({ url }).getLongLink()
  let result: IDDataTypes = {} as IDDataTypes

  switch (true) {
    case /video\/([A-Za-z0-9]+)/.test(longLink): {
      const bvideoMatch = longLink.match(/video\/([A-Za-z0-9]+)/)
      result = {
        type: BilibiliDataType['单个视频作品数据'],
        id: bvideoMatch ? bvideoMatch[1] : '',
      }
      break
    }
    case /play\/(\S+?)\??/.test(longLink): {
      const playMatch = longLink.match(/play\/(\w+)/)
      result = {
        type: BilibiliDataType['番剧数据'],
        id: playMatch ? playMatch[1] : '',
      }
      break
    }
    case /^https:\/\/t\.bilibili\.com\/(\d+)/.test(longLink) || /^https:\/\/www\.bilibili\.com\/opus\/(\d+)/.test(longLink): {
      const tMatch = longLink.match(/^https:\/\/t\.bilibili\.com\/(\d+)/)
      const opusMatch = longLink.match(/^https:\/\/www\.bilibili\.com\/opus\/(\d+)/)
      const dynamic_id = tMatch || opusMatch
      result = {
        type: BilibiliDataType['动态详情数据'],
        dynamic_id: dynamic_id ? dynamic_id[1] : '',
      }
      break
    }
    default:
      break
  }
  return result
}
