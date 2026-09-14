import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliDynamicDetailResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 动态详情（单请求）。
 *
 * 与旧版一致：`getDynamicDetail` GET，无签名。
 */
export const dynamicDetail = defineEndpoint({
  name: 'bilibili.dynamicDetail',
  route: '/fetch_dynamic_info',
  doc: {
    summary: '动态详情',
    description:
      '响应是**判别联合**，判别式在 `data.item.type`：当前类型覆盖 `DYNAMIC_TYPE_AV` / `DYNAMIC_TYPE_DRAW` / `DYNAMIC_TYPE_FORWARD` 三支，正文在 `item.modules`，' +
      '`FORWARD` 支被转发的原动态在 `item.orig`；平台若回别的类型（`WORD` / `LIVE_RCMD` / `ARTICLE` 等），落到判别式为 `type?: never` 的兜底支。`features` 那串开关写死在 URL 构造里，调用方不用管。无签名。'
  },
  params: zod.object({
    dynamic_id: zod.string().min(1, { error: '动态ID不能为空' }).describe('动态 ID（`id_str`，纯数字串）')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getDynamicDetail(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliDynamicDetailResponse>()
})
