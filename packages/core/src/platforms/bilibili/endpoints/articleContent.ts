import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliArticleContentResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 专栏正文内容（单请求）。
 *
 * 与旧版一致：`getArticleContent` GET，无签名。
 */
export const articleContent = defineEndpoint({
  name: 'bilibili.articleContent',
  route: '/fetch_article_content',
  doc: { summary: '专栏正文内容' },
  params: zod.object({
    id: zod.string().min(1, { error: '专栏ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleContent(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleContentResponse>()
})
