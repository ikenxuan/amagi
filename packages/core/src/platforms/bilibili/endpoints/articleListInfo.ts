import zod from 'zod'

import type { BilibiliArticleListInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 文集基本信息（单请求）。
 *
 * 与旧版一致：`getArticleListInfo` GET，无签名。
 */
export const articleListInfo = defineBilibiliEndpoint({
  name: 'bilibili.articleListInfo',
  route: '/fetch_column_info',
  doc: {
    summary: '文集基本信息',
    description: '取文集（`rlid`）本体与其中的文章清单；单篇专栏用 `articleInfo`。'
  },
  params: zod.object({
    id: zod.string().min(1, { error: '文集ID不能为空' }).describe('文集 ID（`rlid`），取自文集链接')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleListInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleListInfoResponse>()
})
