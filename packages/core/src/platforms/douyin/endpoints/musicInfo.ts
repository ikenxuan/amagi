import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 音乐信息（单请求）。
 *
 * 与 v6 的 `musicInfo` 一致：`getMusicInfo` GET + a_bogus 签名。
 */
export const musicInfo = defineEndpoint({
  name: 'douyin.musicInfo',
  route: '/fetch_music_work',
  doc: { summary: '音乐作品信息' },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getMusicInfo(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦（#188）
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinReturnTypeMap['musicInfo']>()
})
