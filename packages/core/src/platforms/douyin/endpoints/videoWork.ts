import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinVideoWorkResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'

/**
 * 视频作品详情（新路径 `/fetch_video_work`，避免与其他作品类型共用路由）。
 *
 * 行为与旧版一致：`getWorkDetail` GET + a_bogus 签名。
 */
export const videoWork = defineEndpoint({
  name: 'douyin.videoWork',
  route: '/fetch_video_work',
  doc: {
    summary: '视频作品详细信息',
    description:
      '与 `parseWork` 打同一个上游 `getWorkDetail`（`www-hj` 边缘），差别只在路由与声明的响应类型：这条按**视频作品**裁形状（`DouyinVideoWorkResponse`）。' +
      '命中 Argus 拦截时换一整套参数重试（`retryOn: ANTIBOT_PAGE` + `retryFresh`）：Argus 按单次请求的 token 组判定、不锁账号，' +
      '原样重放同一个 `msToken` + `a_bogus` 必然同样被拦，所以每次重试都重新 build（新 `msToken`）与重新签名（新 `a_bogus`）。'
  },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID')
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getWorkDetail(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinVideoWorkResponse>(),
  // 预留：跨平台语义视图接入时在此填 (raw) => CanonicalWork
  toCanonical: undefined
})
