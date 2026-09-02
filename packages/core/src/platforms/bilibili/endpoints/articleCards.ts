import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 专栏显示卡片信息（单请求）。
 *
 * 与 v6 的 `articleCards` 一致：`getArticleCards` GET，无签名。
 * `ids` 可传字符串或字符串数组（v6 语义）。
 */
export const articleCards = defineEndpoint({
  name: 'bilibili.articleCards',
  route: '/fetch_article_card',
  params: zod.object({
    ids: zod.union([
      zod.array(zod.string({ error: '被查询的 id 列表必须是字符串数组' })).min(1, { error: '被查询的 id 列表不能为空' }),
      zod.string({ error: '被查询的 id 列表必须是字符串' }).min(1, { error: '被查询的 id 列表不能为空' })
    ])
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleCards(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<ArticleCardsData>()
})

/** 专栏卡片响应（与 v6 形状一致的最小声明） */
export interface ArticleCardsData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
