import zod from 'zod'

import type { DouyinMusicInfoResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { defineDouyinEndpoint, type } from './define'

/**
 * 音乐信息（单请求）。
 *
 * 与旧版一致：`getMusicInfo` GET + a_bogus 签名。
 */
export const musicInfo = defineDouyinEndpoint({
  name: 'douyin.musicInfo',
  route: '/fetch_music_work',
  doc: {
    summary: '音乐作品信息',
    description: '带 mp3 播放地址与使用量的音乐详情；免鉴权版本用 `guestMusicInfo`。'
  },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' }).describe('音乐 ID（mid）')
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getMusicInfo(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinMusicInfoResponse>()
})
