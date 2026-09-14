import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinMusicInfoResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'

/**
 * 音乐信息（单请求）。
 *
 * 与旧版一致：`getMusicInfo` GET + a_bogus 签名。
 */
export const musicInfo = defineEndpoint({
  name: 'douyin.musicInfo',
  route: '/fetch_music_work',
  doc: {
    summary: '音乐作品信息',
    description:
      '走 `music/detail`：一次请求就带 mp3（`play_url`）与权威的 `user_count`，代价是要 cookie + 签名（`a_bogus`）。' +
      '免鉴权的替代通道是 `guestMusicInfo`（`music/info`）—— 那条不要 cookie 与签名，但 `music_info` 里**没有 `play_url`**。' +
      '两条是并列关系、不是主备，谁优先由调用方按场景排。'
  },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' }).describe('音乐 ID（`mid`）')
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getMusicInfo(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinMusicInfoResponse>()
})
