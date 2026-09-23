import zod from 'zod'

import type { BilibiliArticleContentResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 专栏正文内容（单请求）。
 *
 * 与旧版一致：`getArticleContent` GET，无签名。
 */
export const articleContent = defineBilibiliEndpoint({
  name: 'bilibili.articleContent',
  route: '/fetch_article_content',
  doc: {
    summary: '专栏正文内容',
    description: '取专栏正文；标题、作者、阅读统计等元信息用 `articleInfo`。'
  },
  params: zod.object({
    id: zod.string().min(1, { error: '专栏ID不能为空' }).describe('专栏 ID，取自专栏链接')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleContent(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleContentResponse>()
})
