import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinParseWorkResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

/**
 * 解析作品（原 `/fetch_one_work` 路径保留）。
 *
 * 5 个作品类型各占一条独立路由：`parseWork` 保留 `/fetch_one_work`，
 * 其余 4 个各占新路径。
 * 与旧版一致：`getWorkDetail` GET + a_bogus 签名，返回原始响应。
 */
export const parseWork = defineDouyinEndpoint({
  name: 'douyin.parseWork',
  route: '/fetch_one_work',
  doc: {
    summary: '聚合解析作品数据（自动识别类型）',
    description: '同一个作品 ID 可能是视频、图集、合辑、文字或文章，这条自动识别形态并返回对应结构。'
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
  response: type<DouyinParseWorkResponse>()
})
