import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 直播间初始化信息（单请求）。
 *
 * 与 v6 的 `liveRoomInit` 一致：`getLiveRoomInit` GET，无签名。
 */
export const liveRoomInit = defineEndpoint({
  name: 'bilibili.liveRoomInit',
  route: '/fetch_liveroom_def',
  params: zod.object({
    room_id: zod.string().min(1, { error: '直播间ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getLiveRoomInit(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['liveRoomInit']>()
})
