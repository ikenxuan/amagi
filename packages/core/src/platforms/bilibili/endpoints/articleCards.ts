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
    description:
      '一次可以查多条：`ids` 传数组会拼成逗号分隔的 `ids` 查询参数，响应的 `data` 按每个 id 分组（视频是 `av2`、专栏是 `cv1`、直播间是 `lv5440`）。' +
      '`ids` 不限于专栏 —— 视频 AV/BV 号、专栏 CV 号、直播间长短号都认；无签名，命中 `-412` 风控时退避重试。'
  },
  params: zod.object({
    ids: zod
      .union([
        zod.array(zod.string({ error: '被查询的 id 列表必须是字符串数组' })).min(1, { error: '被查询的 id 列表不能为空' }),
        zod.string({ error: '被查询的 id 列表必须是字符串' }).min(1, { error: '被查询的 id 列表不能为空' })
      ])
      .describe('被查询的 id 列表；可传视频 AV/BV 号、专栏 CV 号或直播间长短号')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleCards(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleCardsResponse>()
})
