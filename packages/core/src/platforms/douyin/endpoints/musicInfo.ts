import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { douyinApiUrls } from '../api'

/**
 * 音乐信息（单请求）。
 *
 * 与 v6 的 `musicInfo` 一致：`getMusicInfo` GET + a_bogus 签名。
 */
export const musicInfo = defineEndpoint({
  name: 'douyin.musicInfo',
  route: '/fetch_music_work',
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getMusicInfo(p) }),
  sign: 'a-bogus',
  response: type<MusicInfoData>()
})

/** 音乐信息响应（与 v6 形状一致的最小声明） */
export interface MusicInfoData {
  music_info?: Record<string, unknown>
  [key: string]: unknown
}
