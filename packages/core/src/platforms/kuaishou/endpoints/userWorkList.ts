import zod from 'zod'

import { kuaishouApiUrls } from '../api'
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, hasNextCursor, type } from './define'

/**
 * 获取用户作品列表（live_api POST + 声明式翻页）。
 *
 * `count` 走 `zod.coerce.number()`：HTTP query 参数一律是字符串，
 * 字符串 `'5'` 会被正常转成数字。
 *
 * 翻页由 `paginate` 声明管理：`pcursor` 由响应带回，`count` 写进
 * `profilePublic` 的查询参数（`userWorkList` 是 `profilePublic` 的
 * 领域化封装）。
 */
export const userWorkList = defineKuaishouEndpoint({
  name: 'kuaishou.userWorkList',
  route: '/fetch_user_work_list',
  doc: {
    summary: '用户公开作品列表',
    description: '取用户公开作品列表。`number` 指定目标条数，翻页由端点自动完成，不用传游标。'
  },
  params: zod.object({
    principalId: zod.string().min(1, { error: 'principalId 不能为空' }).describe('用户 ID'),
    number: zod.coerce.number().int().min(1).max(500).optional().describe('目标条数，默认 12')
  }),
  sign: [hxfalcon()],
  build: (p) => {
    // `pcursor` 不在 zod params 里：它由 `paginate.nextParams` 从上一页带回、写进参数。
    // 这里漏传的话每一页请求的都是首屏（曾经就是这样）
    const pcursor = (p as { pcursor?: unknown }).pcursor
    const req = kuaishouApiUrls.userWorkList({
      principalId: p.principalId,
      count: p.number ?? 12,
      pcursor: typeof pcursor === 'string' ? pcursor : ''
    })
    return { method: 'POST', url: req.url, headers: { 'Content-Type': 'application/json' } }
  },
  // 中途某页失败时保留已取数据，截断经 meta.incomplete 显式告知
  partial: 'tolerate',
  paginate: {
    // 快手按 IP 做分钟级冷却（result=2），连续秒级翻页容易撞上；间隔取 ksp 参考实现的 1200ms
    pageIntervalMs: 1200,
    maxPageSize: 12,
    // response 是 any，页令牌无意义 —— 页退成 Record<string, any>，照样点得到 data.list
    items: (page) => page.data?.list ?? [],
    hasMore: (page) => hasNextCursor(page.data?.pcursor),
    nextParams: (params, page) => ({ ...params, pcursor: page.data?.pcursor ?? '' }),
    // 跨页累积的条目收敛为 `KsUserWorkList` 的扁平形状
    // （`{ principalId, list, pcursor, hasMore, result }`），多页调用下类型依然为真
    merge: ({ lastPage, items }, params) => {
      const pcursor = lastPage.data?.pcursor
      return {
        principalId: params.principalId,
        list: items,
        pcursor: typeof pcursor === 'string' ? pcursor : '',
        // 与 `hasMore` 同一个判据：`no_more` 也是到底，别让调用方拿着它再问一次
        hasMore: hasNextCursor(pcursor),
        result: lastPage.data?.result ?? 1
      }
    }
  },
  response: type<any>()
})
