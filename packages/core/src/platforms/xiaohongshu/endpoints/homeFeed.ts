import zod from 'zod'

import { getCookieValue } from '../../../contracts/cookie'
import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { XiaohongshuHomeFeedResponse } from '../../../types/generated'
import { homeFeed as buildHomeFeed } from '../api'
import { createXiaohongshuGuestCookie } from '../sign'

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
export const homeFeed = defineEndpoint({
  name: 'xiaohongshu.homeFeed',
  route: '/fetch_home_feed',
  doc: {
    summary: '首页推荐笔记列表',
    description:
      'POST 请求 + 前置 `prepare`：cookie 里没有 `a1` 时先换一份 guest cookie（scripting → webprofile → activate 三个会话请求），已有 `a1` 则直接跳过。' +
      '翻页不是声明式的 —— `cursor_score` 要手动续传上一页响应的 `data.cursor_score`。' +
      '`num` / `refresh_type` / `note_index` / `category` 都有内置默认值，不传就走默认。'
  },
  params: zod.object({
    cursor_score: zod.string().optional().describe('翻页游标；首页不传（用内置种子值），续页传上一页响应的 data.cursor_score'),
    num: zod.coerce.number().int().min(1).max(100).optional().describe('单次请求的笔记条数，默认 33（上限 100）'),
    refresh_type: zod.coerce.number().int().optional().describe('刷新类型：1 下拉刷新、3 上拉加载，默认 3'),
    note_index: zod.coerce.number().int().optional().describe('笔记索引，默认 33'),
    category: zod.string().optional().describe('内容分类，默认 homefeed_recommend（首页推荐流）'),
    search_key: zod.string().optional().describe('搜索关键词，默认空字符串')
  }),
  prepare: async (ctx) => {
    if (getCookieValue(ctx.cookie, 'a1')) return {}
    const guestCookie = await createXiaohongshuGuestCookie(ctx.send, ctx.requestConfig)
    return { cookie: guestCookie }
  },
  build: (p) => {
    const { Url, Body, apiPath } = buildHomeFeed(p)
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  sign: 'xhs-post',
  response: type<XiaohongshuHomeFeedResponse>()
})
