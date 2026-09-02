import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import type { Judge } from '../../../contracts/error'
import type { PaginatedValue } from '../../../runtime/paginate'
import { douyinApiUrls } from '../api'
import { filterSearchResponses, parseDouyinMultiJson } from '../decode/multiJson'
import { douyinJudge } from '../judge'
import { withDouyinReferer } from '../referer'

/**
 * 搜索专用 judge：v6 `validateFirstPage` 的反爬判定 + 通用抖音判定。
 *
 * - 空串 / 非对象（multi-JSON 无合法块时 decode 原样透传字符串）→ `auth`
 * - user 类型缺 `user_list`、video / general 缺 `data` → `auth`
 * - 其余交给 `douyinJudge`（status_code / filter_detail）
 */
export const searchJudge: Judge = (raw, http) => {
  if (raw === '') return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
  }
  const body = raw as Record<string, unknown>
  const hasUserList = Array.isArray(body.user_list)
  const hasData = Array.isArray(body.data)
  if (!hasUserList && !hasData) {
    return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
  }
  return douyinJudge(raw, http)
}

/**
 * 搜索（multi-JSON decode + 三种 type 的不同提取逻辑 + 首页校验）。
 *
 * 从 v6 `search` 分支整体搬迁，四个特性逐一对应：
 *
 * 1. **multi-JSON decode**：general 类型返回的是多个 JSON 粘连的字符串
 *    （反爬手段），`decode` 用 `parseDouyinMultiJson` 切块、只留合法搜索
 *    响应块、合并 `data` 数组（v6 的 `processRawResponse`）。user / video
 *    类型是正常 JSON，原样透传。
 * 2. **三种 type 的不同提取逻辑**：user 从 `user_list` 取，video / general
 *    从 `data` 取（v6 的 `extractList` 分支）。
 * 3. **首页校验**：v6 的 `validateFirstPage` —— 响应不是对象 / 缺
 *    `user_list`（user 类型）或 `data`（video / general 类型）判反爬，
 *    返回 `COOKIE` 错误。v7 落在 `searchJudge` 里（判 `kind: 'auth'`）。
 * 4. **分页游标**：`has_more !== 0` 继续；user 用 `rid`，video / general 用
 *    `log_pb.impr_id` 作为下一次的 `search_id`（v6 的 `updateParams`）。
 *
 * 与 v6 的差异：**不签名**（v6 `signType: null`）。
 */
export const search = defineEndpoint({
  name: 'douyin.search',
  route: '/fetch_search_info',
  doc: { summary: '搜索结果列表（综合/用户/视频）' },
  params: zod.object({
    query: zod.string().min(1, { error: '搜索词不能为空' }),
    type: zod.enum(['general', 'user', 'video']).default('general').optional(),
    number: zod.coerce.number().int().min(1).optional(),
    search_id: zod.string().optional()
  }),
  build: (p, ctx) => {
    const searchType = p.type ?? 'general'
    return {
      method: 'GET',
      // v7 api.ts 的 SearchParams 要求 keyword 必填、实现读 query（v6 语义），
      // 两个都传：keyword 满足类型，query 让 URL 里的 keyword 落到真实值
      url: douyinApiUrls.search({
        keyword: p.query,
        query: p.query,
        type: searchType,
        number: p.number,
        search_id: p.search_id
      }),
      headers: withDouyinReferer(ctx, { kind: 'search', query: p.query, type: searchType === 'user' ? 'user' : searchType === 'video' ? 'video' : undefined })
    }
  },
  sign: false, // v6 的 signType: null
  decode: (raw) => {
    if (typeof raw !== 'string') return raw // user / video：正常 JSON，原样透传
    const chunks = parseDouyinMultiJson(raw)
    const responses = filterSearchResponses(chunks)
    if (responses.length === 0) return raw // 没有合法块：留给 judge 判反爬

    const mergedData: unknown[] = []
    let lastValid: Record<string, unknown> = {}
    for (const resp of responses) {
      if (Array.isArray(resp.data) && resp.data.length > 0) mergedData.push(...resp.data)
      lastValid = resp as unknown as Record<string, unknown>
    }
    return { ...lastValid, data: mergedData }
  },
  judge: searchJudge,
  paginate: {
    maxPageSize: 15,
    items: (page) => {
      const p = page as Record<string, unknown>
      if (Array.isArray(p.user_list)) return p.user_list
      return (p.data as unknown[]) ?? []
    },
    hasMore: (page) => (page as { has_more?: number }).has_more !== 0,
    nextParams: (params, page) => {
      const p = page as { rid?: string; log_pb?: { impr_id?: string } }
      const nextSearchId =
        (typeof p.rid === 'string' && p.rid.length > 0 ? p.rid : undefined) ??
        (typeof p.log_pb?.impr_id === 'string' ? p.log_pb.impr_id : undefined) ??
        params.search_id
      return { ...params, search_id: nextSearchId }
    }
  },
  normalize: (decoded): DouyinReturnTypeMap['search'] => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as Record<string, unknown> | undefined
    if (Array.isArray(page?.user_list)) return { ...(page ?? {}), user_list: items } as DouyinReturnTypeMap['search']
    return { ...(page ?? {}), data: items } as DouyinReturnTypeMap['search']
  },
  response: type<DouyinReturnTypeMap['search']>()
})
