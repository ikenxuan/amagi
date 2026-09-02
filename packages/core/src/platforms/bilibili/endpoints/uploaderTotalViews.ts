import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * UP主总播放量（单请求）。
 *
 * 与 v6 的 `uploaderTotalViews` 一致：`getUploaderTotalViews` GET，无签名。
 */
export const uploaderTotalViews = defineEndpoint({
  name: 'bilibili.uploaderTotalViews',
  route: '/fetch_user_full_view',
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUploaderTotalViews(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<UploaderTotalViewsData>()
})

/** UP主总播放量响应（与 v6 形状一致的最小声明） */
export interface UploaderTotalViewsData {
  code?: number
  data?: Record<string, unknown>
  message?: string
  [key: string]: unknown
}
