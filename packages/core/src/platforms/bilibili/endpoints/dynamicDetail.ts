import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 动态详情（单请求）。
 *
 * 与 v6 的 `dynamicDetail` 一致：`getDynamicDetail` GET，无签名。
 */
export const dynamicDetail = defineEndpoint({
  name: 'bilibili.dynamicDetail',
  route: '/fetch_dynamic_info',
  doc: { summary: '动态详情' },
  params: zod.object({
    dynamic_id: zod.string().min(1, { error: '动态ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getDynamicDetail(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['dynamicDetail']>()
})
