import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { kuaishouApiUrls } from '../api'

/**
 * 获取作品评论（graphql POST + 声明式翻页）。
 *
 * 修 #57：v6 的 comments schema **不接受 `pcursor` / `count`**，无法翻页
 * （KNOWN-DEFECT 有测试锁死）。v7 补上分页参数，游标由 `paginate` 声明管理：
 * `items` 取 `data.visionCommentList.rootComments`，`hasMore` 看
 * `pcursor` 是否非空，`nextParams` 把响应里的 `pcursor` 带回请求。
 *
 * 与 v6 的行为差异只在这一处：v6 单次请求必带 `pcursor: ''`，
 * v7 由调用方传 `number` 指定目标条数（可选，默认一页），
 * `pcursor` 不再暴露为自由参数。
 */
export const comments = defineEndpoint({
  name: 'kuaishou.comments',
  route: '/fetch_work_comments',
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }),
    /** 目标条数；由 paginate 切成多次请求，默认一页 */
    number: zod.coerce.number().int().min(1).max(500).optional()
  }),
  build: (p) => {
    const req = kuaishouApiUrls.comments(p)
    return { method: 'POST', url: req.url, body: req.body, headers: { 'Content-Type': 'application/json' } }
  },
  paginate: {
    maxPageSize: 50,
    items: (page) => ((page as CommentsPage).data?.visionCommentList?.rootComments ?? []) as unknown[],
    hasMore: (page) => {
      const pcursor = (page as CommentsPage).data?.visionCommentList?.pcursor
      return typeof pcursor === 'string' && pcursor.length > 0
    },
    nextParams: (params, page) => ({
      ...params,
      pcursor: (page as CommentsPage).data?.visionCommentList?.pcursor ?? ''
    })
  },
  response: type<CommentsData>()
})

/** 一页评论响应的形状（paginate 声明里用） */
interface CommentsPage {
  data?: {
    visionCommentList?: {
      commentCount?: number
      pcursor?: string
      rootComments?: unknown[]
    }
  }
}

/** 评论响应 */
export interface CommentsData {
  data: {
    visionCommentList: {
      commentCount: number
      pcursor: string
      rootComments: Array<{ commentId: string; authorId: string; content: string; timestamp: number }>
    }
  }

  /** 平台加字段不算 breaking（06-migration：类型是实测快照） */
  [key: string]: unknown
}
