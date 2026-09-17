import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliArticleInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 专栏文章基本信息（单请求）。
 *
 * 与旧版一致：`getArticleInfo` GET，无签名。
 */
export const articleInfo = defineEndpoint({
  name: 'bilibili.articleInfo',
  route: '/fetch_article_info',
  doc: {
    summary: '专栏文章基本信息',
    description: '取文章页元信息（标题、头图、作者、阅读/点赞）；正文用 `articleContent`。'
  },
  params: zod.object({
    id: zod.string().min(1, { error: '专栏ID不能为空' }).describe('专栏 ID，取自专栏链接')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleInfoResponse>()
})
