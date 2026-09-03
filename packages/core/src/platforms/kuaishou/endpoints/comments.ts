import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { PaginatedValue } from '../../../runtime/paginate'
import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import { kuaishouApiUrls } from '../api'
import { kuaishouH5Headers } from '../config'
import { kuaishouDidPrepare } from '../did'

/**
 * 获取作品评论（H5 `photo/comment/list`，POST + 声明式翻页）。
 *
 * 从 PC GraphQL 的 `commentListQuery` 换过来 —— 那条未登录返回全 null 空壳
 * （对照项目实测有记录），这条是分享页接口、免账号鉴权。
 *
 * 参数**必须放 body**：放 query 会拿到 `result=1` 但 0 条评论。对照项目路由表里
 * 的 `parameterNames` 是给 OPTIONS 预检用的，照搬到实际请求上就踩这个坑
 * （@OduckO 的 kuaishou-parser `TODO.md:197-199`）。
 *
 * 响应形状与 GraphQL 那条**不同**，翻页声明因此整个改写：条目在顶层
 * `rootComments`（不是 `data.visionCommentList.rootComments`），游标在顶层
 * `pcursor`，且子评论**不内嵌**在根评论里 —— 它们在 `subCommentsMap` 里按根评论
 * ID 分组。按「不归一化」的决定，这些差异原样透给下游。
 *
 * 修 #57 的翻页能力保持不变：调用方传 `number` 指定目标条数，`pcursor` 由
 * `paginate` 声明管理，不暴露为自由参数。
 */
export const comments = defineEndpoint({
  name: 'kuaishou.comments',
  route: '/fetch_work_comments',
  doc: { summary: '作品评论列表' },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }),
    /** 目标条数；由 paginate 切成多次请求，默认一页 */
    number: zod.coerce.number().int().min(1).max(500).optional()
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
    items: (page) => ((page as CommentsPage).rootComments ?? []) as unknown[],
    hasMore: (page) => {
      const pcursor = (page as CommentsPage).pcursor
      return typeof pcursor === 'string' && pcursor.length > 0 && pcursor !== 'no_more'
    },
    nextParams: (params, page) => ({
      ...params,
      pcursor: (page as CommentsPage).pcursor ?? ''
    })
  },
  // 跨页累积的条目回填到最后一页的原位（v6 fetchPaginatedData 的 formatFinalResponse
  // 语义）。这不是「归一化」—— 只是把翻页拿到的条目放回它本来的位置，
  // 使返回类型在多页调用下依然描述真实形状。
  normalize: (decoded): KuaishouReturnTypeMap['comments'] => {
    const { lastPage, items } = decoded as PaginatedValue
    const page = lastPage as CommentsPage | undefined
    return { ...(page ?? {}), rootComments: items } as KuaishouReturnTypeMap['comments']
  },
  response: type<KuaishouReturnTypeMap['comments']>()
})

/** 一页评论响应的形状（paginate 声明里用） */
interface CommentsPage {
  result?: number
  commentCount?: number
  pcursor?: string
  rootComments?: unknown[]
  subCommentsMap?: Record<string, { subComments?: unknown[]; pcursor?: string }>
}
