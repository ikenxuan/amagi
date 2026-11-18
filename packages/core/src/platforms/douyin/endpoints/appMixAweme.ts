import zod from 'zod'

import { appRequest, uniqueAppItems } from '../aweme/api'
import { defineAwemeEndpoint, internalParam, type } from '../aweme/define'

export const appMixAweme = defineAwemeEndpoint({
  name: 'douyin.appMixAweme',
  route: '/app_fetch_mix_aweme',
  doc: { summary: 'App 合集作品列表', description: '实验接口：已确认移动端声明，当前游客样本未返回有效列表。' },
  params: zod.object({
    mix_id: zod.string().min(1, { error: '合集ID不能为空' }).describe('合集 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    cursor: internalParam(zod.coerce.number().int().min(0).optional())
  }),
  build: (p) => appRequest('/aweme/v1/mix/aweme/', { mix_id: p.mix_id, cursor: p.cursor ?? 0, count: p.number ?? 20, pull_type: 1 }, true),
  partial: 'tolerate',
  paginate: {
    maxPageSize: 20,
    itemKey: 'aweme_id',
    items: (page) => page.aweme_list ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: page.cursor }),
    merge: ({ lastPage, items }) => ({ ...lastPage, aweme_list: uniqueAppItems(items, 'aweme_id') })
  },
  response: type<any>()
})
