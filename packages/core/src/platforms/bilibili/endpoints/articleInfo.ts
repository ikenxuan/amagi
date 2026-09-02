import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 专栏文章基本信息（单请求）。
 *
 * 与 v6 的 `articleInfo` 一致：`getArticleInfo` GET，无签名。
 */
export const articleInfo = defineEndpoint({
  name: 'bilibili.articleInfo',
  route: '/fetch_article_info',
  params: zod.object({
    id: zod.string().min(1, { error: '专栏ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<ArticleInfoData>()
})

/** 专栏信息响应（与 v6 形状一致的最小声明） */
export interface ArticleInfoData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
