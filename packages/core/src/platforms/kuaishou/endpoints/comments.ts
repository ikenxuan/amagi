import zod from 'zod'

import type { KuaishouCommentsResponse } from '../../../types/generated'
import { kuaishouApiUrls } from '../api'
import { kuaishouH5Headers } from '../config'
import { kuaishouDidPrepare } from '../did'
import { defineKuaishouEndpoint, type } from './define'

/**
 * 获取作品评论（H5 `photo/comment/list`，POST + 声明式翻页）。
 *
 * PC GraphQL 的 `commentListQuery` 未登录返回全 null 空壳，所以走这条分享页
 * 接口、免账号鉴权。
 *
 * 参数**必须放 body**：放 query 会拿到 `result=1` 但 0 条评论。路由表里的
 * `parameterNames` 是给 OPTIONS 预检用的，照搬到实际请求上就踩这个坑
 * （@OduckO 的 kuaishou-parser `TODO.md:197-199`）。
 *
 * 响应形状与 GraphQL 那条**不同**，翻页声明因此整个改写：条目在顶层
 * `rootComments`（不是 `data.visionCommentList.rootComments`），游标在顶层
 * `pcursor`，且子评论**不内嵌**在根评论里 —— 它们在 `subCommentsMap` 里按根评论
 * ID 分组。这些差异原样透给下游。
 *
 * 翻页：调用方传 `number` 指定目标条数，`pcursor` 由 `paginate` 声明管理，
 * 不暴露为自由参数。
 */
export const comments = defineKuaishouEndpoint({
  name: 'kuaishou.comments',
  route: '/fetch_work_comments',
  doc: {
    summary: '作品评论列表',
    description: '取作品评论列表，子评论按根评论 ID 分组返回。`number` 指定目标条数，翻页自动完成。'
  },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }).describe('作品 ID'),
    number: zod.coerce.number().int().min(1).max(500).optional().describe('目标条数，默认一页')
  }),
  sign: 'hxfalcon',
  prepare: kuaishouDidPrepare,
  build: (p) => {
    const req = kuaishouApiUrls.comments(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      signPath: req.signPath,
      headers: kuaishouH5Headers(req.referer)
    }
  },
  paginate: {
    maxPageSize: 50,
    items: (page) => page.rootComments ?? [],
    hasMore: (page) => {
      const pcursor = page.pcursor
      return typeof pcursor === 'string' && pcursor.length > 0 && pcursor !== 'no_more'
    },
    nextParams: (params, page) => ({ ...params, pcursor: page.pcursor ?? '' }),
    // 跨页累积的条目回填到最后一页 rootComments 的原位，使返回类型在多页调用下仍描述真实形状。
    // 子评论在 subCommentsMap 里按根评论 ID 分组，不受影响
    merge: ({ lastPage, items }) => ({ ...lastPage, rootComments: items })
  },
  response: type<KuaishouCommentsResponse>()
})
