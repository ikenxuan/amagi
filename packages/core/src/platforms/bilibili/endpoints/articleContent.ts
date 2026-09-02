import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 专栏正文内容（单请求）。
 *
 * 与 v6 的 `articleContent` 一致：`getArticleContent` GET，无签名。
 */
export const articleContent = defineEndpoint({
  name: 'bilibili.articleContent',
  route: '/fetch_article_content',
  params: zod.object({
    id: zod.string().min(1, { error: '专栏ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleContent(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<ArticleContentData>()
})

/** 专栏正文响应（与 v6 形状一致的最小声明） */
export interface ArticleContentData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
