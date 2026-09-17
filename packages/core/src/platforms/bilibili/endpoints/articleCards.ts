import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliArticleCardsResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 专栏显示卡片信息（单请求）。
 *
 * 与旧版一致：`getArticleCards` GET，无签名。
 * `ids` 可传字符串或字符串数组。
 */
export const articleCards = defineEndpoint({
  name: 'bilibili.articleCards',
  route: '/fetch_article_card',
  doc: {
    summary: '专栏显示卡片信息',
    description: '一次可批量查询多条，支持视频、专栏、直播间的 ID 混传，结果按 ID 分组返回。'
  },
  params: zod.object({
    ids: zod
      .union([
        zod.array(zod.string({ error: '被查询的 id 列表必须是字符串数组' })).min(1, { error: '被查询的 id 列表不能为空' }),
        zod.string({ error: '被查询的 id 列表必须是字符串' }).min(1, { error: '被查询的 id 列表不能为空' })
      ])
      .describe('ID 列表，可混传视频、专栏、直播间')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleCards(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleCardsResponse>()
})
