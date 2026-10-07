import zod from 'zod'

import type { DouyinMixAwemeResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, internalParam, type } from './define'

/** 合集作品列表。合集 ID 取自作品详情的 `aweme_detail.mix_info.mix_id`，不是音乐 ID：mid。 */
export const mixAweme = defineDouyinEndpoint({
  name: 'douyin.mixAweme',
  route: '/fetch_mix_aweme',
  doc: {
    summary: '合集作品列表',
    description: '按 mix_id 获取合集内的作品；mix_id 取自作品详情 mix_info.mix_id，number 为目标条数。'
  },
  params: zod.object({
    mix_id: zod.string().trim().min(1, { error: '合集ID不能为空' }).describe('合集 ID，取自作品详情 mix_info.mix_id'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    cursor: internalParam(zod.coerce.number().int().min(0).optional().describe('翻页游标，一般不用传'))
  }),
  build: (params, ctx) => ({ method: 'GET', url: createDouyinApiUrls(ctx.userAgent).getMixAweme(params) }),
  sign: 'a-bogus',
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  // 中途某页失败时保留已取数据，截断经 meta.incomplete 显式告知
  partial: 'tolerate',
  paginate: {
    maxPageSize: 20,
    items: (page) => page.aweme_list ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: page.cursor ?? params.cursor ?? 0 }),
    // 跨页累积的作品回填到最后一页 aweme_list 的原位，使返回类型在多页调用下仍描述真实形状
    merge: ({ lastPage, items }) => ({ ...lastPage, aweme_list: items, cursor: lastPage.cursor ?? items.length })
  },
  response: type<DouyinMixAwemeResponse>()
})
