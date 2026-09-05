import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 视频作品详情（新路径 `/fetch_video_work`，修 #47/#48/#54 的路由冲突）。
 *
 * 行为与 v6 的 `videoWork` 一致：`getWorkDetail` GET + a_bogus 签名。
 */
export const videoWork = defineEndpoint({
  name: 'douyin.videoWork',
  route: '/fetch_video_work',
  doc: { summary: '视频作品详细信息' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getWorkDetail(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦（#188）
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinReturnTypeMap['videoWork']>(),
  // Phase 2 接口预留：跨平台语义视图接入时在此填 (raw) => CanonicalWork
  toCanonical: undefined
})
