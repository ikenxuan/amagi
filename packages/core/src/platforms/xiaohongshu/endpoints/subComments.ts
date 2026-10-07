import zod from 'zod'

import type { XiaohongshuSubCommentsResponse } from '../../../types/generated'
import { subComments as buildSubComments } from '../api'
import { guestFallbackPrepare } from '../guestPrepare'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 一级评论下的回复（楼中楼），GET + 声明式翻页。
 *
 * 2026-09-20 通过 CDP 展开评论回复抓包：
 * GET /api/sns/web/v2/comment/sub/page?note_id&root_comment_id&num=10&cursor&image_formats&top_comment_id=&xsec_token
 * `root_comment_id` 指定要展开的一级评论。与一级评论相同，
 * 这里用 xhs-get-trace 签名（XYS_ 前缀 + trace 头，不带 RAP）。
 */
export const subComments = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.subComments',
  route: '/fetch_sub_comments',
  doc: {
    summary: '子评论（楼中楼）列表',
    description: '展开某条一级评论下的回复。`number` 指定目标条数，翻页自动完成。'
  },
  params: zod.object({
    note_id: zod.string().min(1, { error: 'note_id 不能为空' }).describe('笔记 ID'),
    root_comment_id: zod.string().min(1, { error: 'root_comment_id 不能为空' }).describe('要展开的一级评论 ID'),
    xsec_token: zod.string().min(1, { error: 'xsec_token 不能为空' }).describe('反爬令牌，随笔记分享链接下发'),
    number: zod.coerce.number().int().min(1).max(500).optional().describe('目标条数，默认一页')
  }),
  prepare: guestFallbackPrepare,
  build: (p) => {
    const { Url, apiPath, signParams } = buildSubComments({ ...p, num: p.number })
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  sign: 'xhs-get-trace',
  // 中途某页失败时保留已取数据，截断经 meta.incomplete 显式告知
  partial: 'tolerate',
  paginate: {
    maxPageSize: 10,
    items: (page) => page.data?.comments ?? [],
    hasMore: (page) => page.data?.has_more === true,
    nextParams: (params, page) => ({ ...params, cursor: page.data?.cursor ?? '' }),
    // 跨页累积的回复回填到最后一页 data.comments 的原位，使返回类型在多页调用下仍描述真实形状
    merge: ({ lastPage, items }) => ({ ...lastPage, data: { ...lastPage.data, comments: items } })
  },
  response: type<XiaohongshuSubCommentsResponse>()
})
