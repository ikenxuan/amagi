import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinParseWorkResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'

/**
 * 解析作品（原 `/fetch_one_work` 路径保留）。
 *
 * 5 个作品类型各占一条独立路由：`parseWork` 保留 `/fetch_one_work`，
 * 其余 4 个各占新路径。
 * 与旧版一致：`getWorkDetail` GET + a_bogus 签名，返回原始响应。
 */
export const parseWork = defineEndpoint({
  name: 'douyin.parseWork',
  route: '/fetch_one_work',
  doc: {
    summary: '聚合解析作品数据（自动识别类型）',
    description: '同一个作品 ID 可能是视频、图集、合辑、文字或文章，这条自动识别形态并返回对应结构。'
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
  response: type<DouyinParseWorkResponse>()
})
