import zod from 'zod'

import type { KuaishouSearchWorkListResponse } from '../../../types/generated'
import { kuaishouApiUrls, type KuaishouSearchParams } from '../api'
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, hasNextCursor, type } from './define'

/**
 * PC 作品搜索。已完成官网设备注册的游客可用。
 * 首屏与翻页请求体不同，由 API 构造器按实测键序生成，保持签名与发送体一致。
 */
export const searchWorkList = defineKuaishouEndpoint({
  name: 'kuaishou.searchWorkList',
  route: '/fetch_search_work_list',
  doc: {
    summary: '搜索作品',
    description: '按关键词搜索作品，自动翻页。需要浏览器注册后的 cookie，支持游客。'
  },
  params: zod.object({
    keyword: zod.string().min(1, { error: 'keyword 不能为空' }).describe('搜索关键词'),
    number: zod.coerce.number().int().min(1).max(500).optional().describe('目标条数，默认 20')
  }),
  sign: [hxfalcon()],
  build: (p) => {
    const req = kuaishouApiUrls.searchWorkList(p as KuaishouSearchParams)
    return { method: req.method, url: req.url, body: req.body }
  },
  partial: 'tolerate',
  paginate: {
    pageIntervalMs: 10_000,
    // 实测单页 19 或 20 条，不把某次少一条当作已到末页。
    maxPageSize: 20,
    page: type<KuaishouSearchWorkListResponse>(),
    items: (page) => page.feeds ?? [],
    hasMore: (page) => hasNextCursor(page.pcursor),
    nextParams: (params, page) => ({
      ...params,
      pcursor: page.pcursor ?? '',
      searchSessionId: page.searchSessionId || (params as KuaishouSearchParams).searchSessionId || ''
    }),
    merge: ({ lastPage, items }) => ({ ...lastPage, feeds: items })
  },
  response: type<KuaishouSearchWorkListResponse>()
})
