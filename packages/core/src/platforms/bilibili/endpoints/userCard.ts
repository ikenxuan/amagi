import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 用户名片信息（单请求）。
 *
 * 与 v6 的 `userCard` 一致：`getUserCard` GET，无签名。
 */
export const userCard = defineEndpoint({
  name: 'bilibili.userCard',
  route: '/fetch_user_profile',
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUserCard(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<UserCardData>()
})

/** 用户名片响应（与 v6 形状一致的最小声明） */
export interface UserCardData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
