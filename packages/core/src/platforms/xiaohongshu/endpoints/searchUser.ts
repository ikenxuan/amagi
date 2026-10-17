import zod from 'zod'

import type { XiaohongshuSearchUserResponse } from '../../../types/generated'
import { searchUser as buildSearchUser } from '../api'
import { xiaohongshuJudge } from '../judge'
import { getSearchId, getSearchRequestId } from '../sign'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 用户搜索（POST），参照 cvcat/Spider_XHS 实抓：
 * `/api/sns/web/v1/search/usersearch`。
 *
 * 用关键词或小红书号解析出 `user_id`，例如在查询用户直播前使用。`search_id` 与
 * `request_id` 在 `build` 里生成并显式传入，保持 api 构造函数为纯函数。
 * `xhs-post` 使用 XYS_ 前缀、不带 `x-rap-param`；旧 edith/v1 域名是否要求 RAP
 * 仍需在真实浏览器会话中验证。
 */
export const searchUser = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.searchUser',
  route: '/fetch_search_user',
  doc: {
    summary: '搜索用户结果列表',
    description: '按关键词或小红书号搜用户，返回 user_id 等。翻页手动传 `page`。'
  },
  params: zod.object({
    keyword: zod.string().min(1, { error: 'keyword 不能为空' }).describe('搜索关键词或小红书号'),
    page: zod.coerce.number().int().min(1).optional().describe('页码，从 1 开始，默认 1'),
    page_size: zod.coerce.number().int().min(1).max(100).optional().describe('每页条数，默认 15')
  }),
  build: (p) => {
    const { Url, Body, apiPath } = buildSearchUser(p, getSearchId(), getSearchRequestId())
    return { method: 'POST', url: Url, body: Body, signPath: apiPath }
  },
  sign: 'xhs-post',
  // 只有 usersearch 用 1000 表示成功；其他端点仍走平台 judge。
  judge: (raw, http) => {
    if (typeof raw === 'object' && raw !== null && 'code' in raw && raw.code === 1000 && 'success' in raw && raw.success === true) {
      return xiaohongshuJudge({ ...raw, code: 0 }, http)
    }
    return xiaohongshuJudge(raw, http)
  },
  response: type<XiaohongshuSearchUserResponse>()
})
