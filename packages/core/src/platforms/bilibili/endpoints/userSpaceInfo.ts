import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 用户空间详细信息（wbi 签名）。
 *
 * 与 v6 的 `userSpaceInfo` 一致：`getUserSpaceInfo` GET + wbi 签名。
 */
export const userSpaceInfo = defineEndpoint({
  name: 'bilibili.userSpaceInfo',
  route: '/fetch_user_space_info',
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUserSpaceInfo(p) }),
  sign: 'wbi',
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['userSpaceInfo']>()
})
