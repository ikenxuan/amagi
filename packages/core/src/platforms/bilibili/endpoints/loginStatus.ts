import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 登录基本信息（单请求）。
 *
 * 与 v6 的 `loginStatus` 一致：`getLoginStatus` GET，无签名。
 */
export const loginStatus = defineEndpoint({
  name: 'bilibili.loginStatus',
  route: '/login_basic_info',
  doc: { summary: '登录基本信息' },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getLoginStatus() }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['loginStatus']>()
})
