import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 用户直播状态（单请求）。
 *
 * 与 v6 的 `userLiveStatus` 一致：`getUserLiveStatus` GET，无签名。
 */
export const userLiveStatus = defineEndpoint({
  name: 'bilibili.userLiveStatus',
  route: '/fetch_user_live_status',
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUserLiveStatus(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<UserLiveStatusData>()
})

/** 用户直播状态响应（与 v6 形状一致的最小声明） */
export interface UserLiveStatusData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
