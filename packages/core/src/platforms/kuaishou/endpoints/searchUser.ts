import zod from 'zod'

import { kuaishouApiUrls, type KuaishouSearchParams } from '../api'
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, hasNextCursor, type } from './define'

/**
 * PC 用户搜索。已完成官网设备注册的游客可用，不要求账号登录。
 * 首屏实测；翻页三键形状来自 PC bundle 的 fetchMore，游标与搜索会话一起回传。
 */
export const searchUser = defineKuaishouEndpoint({
  name: 'kuaishou.searchUser',
  route: '/fetch_search_user',
  doc: {
    summary: '搜索用户',
    description: '按关键词搜索用户，自动翻页。需要浏览器注册后的 cookie，支持游客。'
  },
  params: zod.object({
    keyword: zod.string().min(1, { error: 'keyword 不能为空' }).describe('搜索关键词'),
    number: zod.coerce.number().int().min(1).max(500).optional().describe('目标条数，默认 30')
  }),
  sign: [hxfalcon()],
  build: (p) => {
    // 分页状态由 nextParams 注入，不属于公开的查询参数。
    const extra = p as KuaishouSearchParams
    const req = kuaishouApiUrls.searchUser(extra)
    return { method: req.method, url: req.url, body: req.body }
  },
  partial: 'tolerate',
  paginate: {
    pageIntervalMs: 10_000,
    maxPageSize: 30,
    items: (page) => page.users ?? [],
    hasMore: (page) => hasNextCursor(page.pcursor),
    nextParams: (params, page) => ({
      ...params,
      pcursor: page.pcursor ?? '',
      searchSessionId: page.searchSessionId || (params as KuaishouSearchParams).searchSessionId || ''
    }),
    merge: ({ lastPage, items }) => ({ ...lastPage, users: items })
  },
  response: type<any>()
})
