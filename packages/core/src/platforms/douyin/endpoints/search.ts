import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { Judge } from '../../../contracts/error'
import type { PaginatedValue } from '../../../runtime/paginate'
import type { DouyinSearchResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { filterSearchResponses, parseDouyinMultiJson } from '../decode/multiJson'
import { douyinJudge, isDouyinArgusBody } from '../judge'
import { withDouyinReferer } from '../referer'

/**
 * 搜索专用 judge：反爬判定 + 通用抖音判定。
 *
 * - Argus 拦截文本 → `risk` / `ANTIBOT_PAGE`（可重试）。**必须排在最前** ——
 *   这条 judge 的存在理由是「搜索的响应本来就可能是字符串」，因此它绕开了
 *   `douyinJudge` 里的 `verdictFromNonJsonBody`；不单独认一次 Argus，
 *   被风控拦下就会落进下面那条 `auth`，报成「登录状态已失效」，误导排查
 * - 空串 / 非对象（multi-JSON 无合法块时 decode 原样透传字符串）→ `auth`
 * - user 类型缺 `user_list`、video / general 缺 `data` → `auth`
 * - 其余交给 `douyinJudge`（status_code / filter_detail）
 */
export const searchJudge: Judge = (raw, http) => {
  if (isDouyinArgusBody(raw)) return { ok: false, kind: 'risk', code: 'ANTIBOT_PAGE', retryable: true }
  if (raw === '') return { ok: false, kind: 'auth', code: 'EMPTY_RESPONSE', retryable: false }
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
 * 搜索响应里「这一发实际是哪种搜索」的字段名。**amagi 加的，不是平台发的。**
 *
 * 这个端点的响应形状由**请求参数** `type` 决定（general 是 `data`、user 是
 * `user_list`、video 是另一套），而响应体里**没有任何字段**能区分三者 ——
 * `path` / `mock_recall_path` 只在 user / video 上出现，general 整个键都不存在。
 *
 * 解法是**让响应自述形态**：在 `normalize` 里把「这一发是哪种」写回响应，下游
 * `if (res.data.__search_type === 'user')` 即可收窄。
 *
 * 判别值怎么定的，见 `normalize` 里那段注释（一句话：user 靠结构，general / video
 * 之间没有可靠结构信号，只能取请求类型）。
 *
 * 字段名带 `__` 前缀是为了跟抖音自己的字段区分开（平台侧全是普通 snake_case）。
 * 它是**加法**：每层都有索引签名，多这一个键不影响任何既有读法。
 */
export const SEARCH_TYPE_FIELD = '__search_type'

/**
 * 搜索（multi-JSON decode + 三种 type 的不同提取逻辑 + 首页校验）。
 *
 * 四个特性：
 *
 * 1. **multi-JSON decode**：general 类型返回的是多个 JSON 粘连的字符串
 *    （反爬手段），`decode` 用 `parseDouyinMultiJson` 切块、只留合法搜索
 *    响应块、合并 `data` 数组。user / video 类型是正常 JSON，原样透传。
 * 2. **三种 type 的不同提取逻辑**：user 从 `user_list` 取，video / general
 *    从 `data` 取。
 * 3. **首页校验**：响应不是对象 / 缺 `user_list`（user 类型）或 `data`
 *    （video / general 类型）判反爬，返回 `COOKIE` 错误（`searchJudge` 里
 *    判 `kind: 'auth'`）。
 * 4. **分页游标**：`has_more !== 0` 继续；user 用 `rid`，video / general 用
 *    `log_pb.impr_id` 作为下一次的 `search_id`。
 *
 * 与旧版一致：**不签名**。
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
      // SearchParams 要求 keyword 必填、实现读 query，两个都传：
      // keyword 满足类型，query 让 URL 里的 keyword 落到真实值
      url: douyinApiUrls.search({
        keyword: p.query,
        query: p.query,
        type: searchType,
        number: p.number,
        search_id: p.search_id
      }),
      headers: withDouyinReferer(ctx, {
        kind: 'search',
        query: p.query,
        type: searchType === 'user' ? 'user' : searchType === 'video' ? 'video' : undefined
      })
    }
  },
  sign: false,
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
  normalize: (decoded, params) => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as Record<string, unknown> | undefined
    /**
     * 判别值 = **响应形状** 与 **请求类型** 的组合，各管一半：
     *
     * - **user 只看结构**：成功路径上 user 必有 `user_list`、video / general 必有 `data`
     *   （`searchJudge` 就是按这条判反爬的），所以 `user_list` 在不在是可靠信号。
     * - **general 与 video 之间没有可靠结构信号**，只能取 `params.type`。
     *   **反爬包装的形态跟逻辑类型不是一回事，不能当判据** —— 分页最后一页是单个
     *   合法 JSON，会被解析成对象，按 wire body 形态判会把 general 误标成 video。
     * - 两者矛盾时（请求 user、回的却是 data 形状）按 `general` 记：「不是 user」比
     *   「请求说是 user」更硬 —— 记成 user 会让下游收窄到「有 `user_list` 的那一支」，
     *   而那恰恰是它没有的东西。
     */
    const requested = params.type ?? 'general'
    const searchType = Array.isArray(page?.user_list) ? 'user' : requested === 'user' ? 'general' : requested
    // 先在 `Record<string, unknown>` 上拼好再断言：带上计算键的对象字面量直接 `as DouyinSearchResponse`
    // 会因「与每一支都不重叠」被 TS 拦下（TS2352），而这里的形状本来就是运行期决定的
    const out: Record<string, unknown> = { ...(page ?? {}), [SEARCH_TYPE_FIELD]: searchType }
    if (Array.isArray(page?.user_list)) out.user_list = items
    else out.data = items
    return out as DouyinSearchResponse
  },
  response: type<DouyinSearchResponse>()
})
