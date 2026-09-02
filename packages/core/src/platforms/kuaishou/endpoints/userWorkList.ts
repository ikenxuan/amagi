import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { kuaishouApiUrls } from '../api'

/**
 * 获取用户作品列表（live_api GET + 声明式翻页）。
 *
 * 修 #58：v6 的 `count` 用 `zod.number()` 而非 `zod.coerce.number()`，
 * 而 HTTP query 参数一律是字符串 —— 通过 HTTP 传 `count` 必然校验失败
 * （KNOWN-DEFECT 有测试锁死）。v7 改用 `coerce`，字符串 `'5'` 正常转数字。
 *
 * 翻页由 `paginate` 声明管理：`pcursor` 由响应带回，`count` 写进
 * `profilePublic` 的查询参数（`userWorkList` 是 `profilePublic` 的
 * 领域化封装）。
 */
export const userWorkList = defineEndpoint({
  name: 'kuaishou.userWorkList',
  route: '/fetch_user_work_list',
  params: zod.object({
    principalId: zod.string().min(1, { error: 'principalId 不能为空' }),
    /** 目标条数；由 paginate 切成多次请求，默认 12 */
    number: zod.coerce.number().int().min(1).max(500).optional()
  }),
  build: (p) => {
    const req = kuaishouApiUrls.userWorkList({ principalId: p.principalId, count: p.number ?? 12 })
    return { method: 'POST', url: req.url, headers: { 'Content-Type': 'application/json' } }
  },
  paginate: {
    maxPageSize: 12,
    items: (page) => ((page as UserWorkListPage).data?.list ?? []) as unknown[],
    hasMore: (page) => {
      const pcursor = (page as UserWorkListPage).data?.pcursor
      return typeof pcursor === 'string' && pcursor.length > 0
    },
    nextParams: (params, page) => ({
      ...params,
      pcursor: (page as UserWorkListPage).data?.pcursor ?? ''
    })
  },
  response: type<UserWorkListData>()
})

/** 一页作品列表响应的形状（paginate 声明里用） */
interface UserWorkListPage {
  data?: {
    list?: unknown[]
    pcursor?: string
    result?: number
  }
}

/** 用户作品列表响应 */
export interface UserWorkListData {
  data: {
    list: Array<{ id: string; type: string; coverUrl?: string }>
    pcursor: string
    hasMore: boolean
    result: number
  }

  /** 平台加字段不算 breaking（06-migration：类型是实测快照） */
  [key: string]: unknown
}
