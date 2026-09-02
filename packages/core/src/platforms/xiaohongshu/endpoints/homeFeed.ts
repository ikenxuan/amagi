import zod from 'zod'

import { getCookieValue } from '../../../contracts/cookie'
import { defineEndpoint, type } from '../../../contracts/endpoint'
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
  params: zod.object({
    cursor_score: zod.string().optional(),
    num: zod.coerce.number().int().min(1).max(100).optional(),
    refresh_type: zod.coerce.number().int().optional(),
    note_index: zod.coerce.number().int().optional(),
    category: zod.string().optional(),
    search_key: zod.string().optional()
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
  response: type<HomeFeedData>()
})

/** 首页推荐响应 */
export interface HomeFeedData {
  code: number
  msg: string
  success: boolean
  data: {
    cursor_score: string
    items: Array<{ id: string; model_type: string; xsec_token: string }>
  }

  /** 平台加字段不算 breaking（06-migration：类型是实测快照） */
  [key: string]: unknown
}
