import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { XiaohongshuHomeFeedResponse } from '../../../types/generated'
import { homeFeed as buildHomeFeed } from '../api'
import { rap, xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 首页推荐（POST）。
 *
 * 无有效用户 Cookie（无 a1）时自动用游客 Cookie 解析 —— 该降级已上移到
 * `defineXiaohongshuEndpoint` 的平台级 `prepare`（见 `sign/guestCookie.ts` 的
 * `prepareXiaohongshuGuestCookie`），对全体小红书端点一致生效，homeFeed 不再单独声明。
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
    num: zod.coerce.number().int().min(1).max(100).optional().describe('单次请求的笔记条数，默认 33'),
    refresh_type: zod.coerce.number().int().optional().describe('刷新类型，默认 3'),
    note_index: zod.coerce.number().int().optional().describe('笔记索引，默认 33'),
    category: zod.string().optional().describe('内容分类，默认首页推荐流'),
    search_key: zod.string().optional().describe('搜索关键词，默认空字符串')
  }),
  build: (p): RequestSpec => {
    const { Url, Body, apiPath } = buildHomeFeed(p)
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  // feed 类接口需额外的 x-rap-param 校验头（2026-03 之后）
  sign: [xs('post', 'xys'), rap()],
  response: type<XiaohongshuHomeFeedResponse>()
})
