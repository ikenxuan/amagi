import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 登录基本信息（单请求）。
 *
 * 与 v6 的 `loginStatus` 一致：`getLoginStatus` GET，无签名。
 */
export const loginStatus = defineEndpoint({
  name: 'bilibili.loginStatus',
  route: '/login_basic_info',
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getLoginStatus() }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<LoginStatusData>()
})

/** 登录状态响应。不复用 `BilibiliReturnTypeMap['loginStatus']`：v6 映射表此键为 `any`，本地最小声明更精确。 */
export interface LoginStatusData {
  code?: number
  data?: {
    isLogin?: boolean
    vipStatus?: number
    [key: string]: unknown
  }
  message?: string
  [key: string]: unknown
}
