import { networks } from '../model'
import { DataType } from '@zuks/types'

interface IDDataTypes {
  type: DataType
  aweme_id?: string
  sec_uid?: string
}

/**
 * return aweme_id
 * @param {string} url 视频分享连接
 * @returns
 */

export default async function GetDouyinID (url: string): Promise<IDDataTypes> {
  const longLink = await new networks({ url }).getLongLink()
  let result: IDDataTypes = {} as IDDataTypes
  switch (true) {
    case /video\/(\d+)/.test(longLink):
      const videoMatch = longLink.match(/video\/(\d+)/)
      result = {
        type: DataType['VideoData'],
        aweme_id: videoMatch ? videoMatch[1] : '',
      }
      break

    case /note\/(\d+)/.test(longLink):
      const noteMatch = longLink.match(/note\/(\d+)/)
      result = {
        type: DataType['NoteData'],
        aweme_id: noteMatch ? noteMatch[1] : '',
      }
      break

    case /user\/(\S+?)\?/.test(longLink):
      const userMatch = longLink.match(/user\/(\S+?)\?/)
      result = {
        type: DataType['UserVideosListData'],
        sec_uid: userMatch ? userMatch[1] : '',
      }
      break
    default:
      break
  }
  return result
}
