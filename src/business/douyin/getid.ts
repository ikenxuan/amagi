import { logger, Networks } from 'amagi/model'
import { DouyinDataType } from 'amagi/types'

interface IDDataTypes {
  type: DouyinDataType
  aweme_id?: string
  sec_uid?: string
}

/**
 * return aweme_id
 * @param {string} url 视频分享连接
 * @returns
 */

export default async function GetDouyinID (url: string): Promise<IDDataTypes> {
  const longLink = await new Networks({ url }).getLongLink()
  let result = {} as IDDataTypes
  switch (true) {
    case /video\/(\d+)/.test(longLink):
      const videoMatch = longLink.match(/video\/(\d+)/)
      result = {
        type: DouyinDataType['单个视频作品数据'],
        aweme_id: videoMatch ? videoMatch[1] : ''
      }
      break

    case /note\/(\d+)/.test(longLink):
      const noteMatch = longLink.match(/note\/(\d+)/)
      result = {
        type: DouyinDataType['图集作品数据'],
        aweme_id: noteMatch ? noteMatch[1] : ''
      }
      break

    case /user\/(\S+?)\?/.test(longLink):
      const userMatch = longLink.match(/user\/(\S+?)\?/)
      result = {
        type: DouyinDataType['用户主页视频列表数据'],
        sec_uid: userMatch ? userMatch[1] : ''
      }
      break
    default:
      break
  }
  logger.mark(result)
  return result
}
