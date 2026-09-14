import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliArticleListInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 文集基本信息（单请求）。
 *
 * 与旧版一致：`getArticleListInfo` GET，无签名。
 */
export const articleListInfo = defineEndpoint({
  name: 'bilibili.articleListInfo',
  route: '/fetch_column_info',
  doc: {
    summary: '文集基本信息',
    description:
      '要的是**文集** ID（`rlid`），不是单篇专栏的 ID —— 两者链接形状相同（都是 `/read/cv<数字>`），凭链接区分不出来。回文集本体与它下面的文章清单；单篇专栏用 `articleInfo` / `articleContent`。无签名。'
  },
  params: zod.object({
    id: zod.string().min(1, { error: '文集ID不能为空' }).describe('文集 ID（`rlid`）；同样取自 `/read/cv` 链接')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleListInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliArticleListInfoResponse>()
})
