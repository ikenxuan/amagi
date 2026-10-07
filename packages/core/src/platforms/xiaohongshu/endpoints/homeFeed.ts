import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { XiaohongshuHomeFeedResponse } from '../../../types/generated'
import { homeFeed as buildHomeFeed } from '../api'
import { guestFallbackPrepare } from '../guestPrepare'
import { direction, rap, traceId, xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 首页推荐（POST + prepare 换 guest cookie）。
 *
 * 覆盖两种非常规形态：POST 请求体 + 前置请求换凭证。
 *
 * `prepare`：cookie 里没有 a1 时，用 transport 换一份 guest cookie
 * （scripting → webprofile → activate 三个会话请求，`reason: 'prepare'`
 * 进 trace）。已有 a1 直接跳过 —— guest cookie 流程有真实网络开销，
 * 不能每次调用都重跑。
 */
export const homeFeed = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.homeFeed',
  route: '/fetch_home_feed',
  doc: {
    summary: '首页推荐笔记列表',
    description: '取首页推荐流笔记。翻页要手动：把上一页响应的 `cursor_score` 传回来。'
  },
  params: zod.object({
    cursor_score: zod.string().optional().describe('翻页游标；首页不传，续页传上一页的值'),
    num: zod.coerce.number().int().min(1).max(100).optional().describe('单次请求的笔记条数，默认 27'),
    refresh_type: zod.coerce.number().int().optional().describe('刷新类型，默认 1'),
    note_index: zod.coerce.number().int().optional().describe('笔记索引，默认 0'),
    category: zod.string().optional().describe('内容分类，默认首页推荐流'),
    search_key: zod.string().optional().describe('搜索关键词，默认空字符串'),
    unread_begin_note_id: zod.string().optional().describe('未读区间起点笔记 ID'),
    unread_end_note_id: zod.string().optional().describe('未读区间终点笔记 ID'),
    unread_note_count: zod.coerce.number().int().min(0).optional().describe('未读笔记数，默认 0'),
    need_num: zod.coerce.number().int().min(1).max(100).optional().describe('需要的笔记数量，默认 8'),
    need_filter_image: zod.stringbool().or(zod.boolean()).optional().describe('是否过滤图片，默认 false')
  }),
  prepare: guestFallbackPrepare,
  build: (p): RequestSpec => {
    const { Url, Body, apiPath } = buildHomeFeed(p)
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  // feed 类接口需额外的 x-rap-param 校验头（2026-03 之后）
  // 2026-10-06 抓包：explore 页的 `homefeed` 同时带 `x-b3-traceid` 与 `xy-direction`，
  // 与笔记详情的 `feed` 同形，所以这两步和 `noteDetail` 对齐。
  sign: [xs('post', 'xys'), traceId(), direction(), rap()],
  response: type<XiaohongshuHomeFeedResponse>()
})
