import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliArticleListInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 文集基本信息（单请求）。
 *
 * 与旧版一致：`getArticleListInfo` GET，无签名。
 */
export const articleListInfo = defineEndpoint({
  name: 'bilibili.articleListInfo',
  route: '/fetch_column_info',
  doc: { summary: '文集基本信息' },
  params: zod.object({
    id: zod.string().min(1, { error: '文集ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleListInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleListInfoResponse>()
})
