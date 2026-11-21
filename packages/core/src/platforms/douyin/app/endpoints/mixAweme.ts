import zod from 'zod'

import type { DouyinAppMixAwemeResponse } from '../../../../types/generated'
import { appRequest, uniqueAppItems } from '../api'
import { defineAwemeEndpoint, internalParam, type } from '../define'
import { awemeJudge } from '../judge'

export const mixAweme = defineAwemeEndpoint({
  name: 'douyin.appMixAweme',
  route: '/app_fetch_mix_aweme',
  doc: {
    summary: 'App 合集作品列表',
    description: '游客可读；按集数游标从头向后翻页，内部使用 pull_type=2。App 原始响应与 Web 独立。'
  },
  params: zod.object({
    mix_id: zod.string().min(1, { error: '合集ID不能为空' }).describe('合集 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    cursor: internalParam(zod.coerce.number().int().min(0).optional())
  }),
  build: (p) =>
    appRequest(
      '/aweme/v1/mix/aweme/',
      { mix_id: p.mix_id, cursor: p.cursor ?? 0, count: p.number ?? 20, pull_type: 2, skip_local_cache: 'false', req_from: 'app' },
      true
    ),
  judge: (raw, http) => {
    const verdict = awemeJudge(raw, http)
    if (!verdict.ok) return verdict
    // 上游的 null 列表不提供作品数据；与明确返回 [] 的正常空列表分开。
    return raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).aweme_list)
      ? verdict
      : { ok: false, kind: 'parse', code: 'EMPTY_RESPONSE', retryable: false }
  },
  partial: 'tolerate',
  paginate: {
    maxPageSize: 20,
    itemKey: 'aweme_id',
    items: (page) => page.aweme_list ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: page.cursor }),
    merge: ({ lastPage, items }) => ({ ...lastPage, aweme_list: uniqueAppItems(items, 'aweme_id') })
  },
  response: type<DouyinAppMixAwemeResponse>()
})
