import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 文集基本信息（单请求）。
 *
 * 与 v6 的 `articleListInfo` 一致：`getArticleListInfo` GET，无签名。
 */
export const articleListInfo = defineEndpoint({
  name: 'bilibili.articleListInfo',
  route: '/fetch_column_info',
  params: zod.object({
    id: zod.string().min(1, { error: '文集ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getArticleListInfo(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['articleListInfo']>()
})
