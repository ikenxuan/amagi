import zod from 'zod'

import type { DouyinTextWorkResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { defineDouyinEndpoint, type } from './define'

/**
 * 图文内容作品详情（新路径 `/fetch_text_work`，避免与其他作品类型共用路由）。
 *
 * 行为与旧版一致：`getWorkDetail` GET + a_bogus 签名。
 */
export const textWork = defineDouyinEndpoint({
  name: 'douyin.textWork',
  route: '/fetch_text_work',
  doc: {
    summary: '文字作品详细信息',
    description: '已知是文字作品时用这条；形态不确定时先用 `parseWork` 自动识别。'
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
  response: type<DouyinTextWorkResponse>()
})
