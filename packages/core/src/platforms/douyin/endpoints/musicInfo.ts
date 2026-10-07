import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinMusicInfoResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

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
  build: (p, ctx): RequestSpec => ({ method: 'GET', url: createDouyinApiUrls(ctx.userAgent).getMusicInfo(p) }),
  sign: douyinBogus(116),
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  response: type<DouyinMusicInfoResponse>()
})
