import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinVideoWorkResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

/**
 * 视频作品详情（新路径 `/fetch_video_work`，避免与其他作品类型共用路由）。
 *
 * 行为与旧版一致：`getWorkDetail` GET + a_bogus 签名。
 */
export const videoWork = defineDouyinEndpoint({
  name: 'douyin.videoWork',
  route: '/fetch_video_work',
  doc: {
    summary: '视频作品详细信息',
    description: '已知是视频作品时用这条；形态不确定时先用 `parseWork` 自动识别。'
  },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID')
  }),
  build: (p, ctx): RequestSpec => ({
    method: 'GET',
    url: createDouyinApiUrls(ctx.userAgent).getWorkDetail(p),
    headers: withDouyinReferer(ctx, { kind: 'video', awemeId: p.aweme_id })
  }),
  sign: douyinBogus(184),
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  response: type<DouyinVideoWorkResponse>(),
  // 预留：跨平台语义视图接入时在此填 (raw) => CanonicalWork
  toCanonical: undefined
})
