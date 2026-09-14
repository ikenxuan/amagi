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
  doc: {
    summary: '专栏正文内容',
    description:
      '`id` 取专栏链接里 `cv` 号后面的数字（`/read/cv43496899` → `43496899`）。与 `articleInfo` 入参同源、同样无签名，区别是这条回**正文本体**，那条回文章页的元信息与统计。'
  },
  params: zod.object({
    id: zod.string().min(1, { error: '专栏ID不能为空' }).describe('专栏 ID；取 `/read/cv` 链接后面的数字')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleContent(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleContentResponse>()
})
