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
    description: '按动态 ID 取详情，返回结构随动态类型（图文 / 转发 / 视频等）而变。'
  },
  params: zod.object({
    dynamic_id: zod.string().min(1, { error: '动态ID不能为空' }).describe('动态 ID，纯数字串')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getDynamicDetail(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliDynamicDetailResponse>()
})
