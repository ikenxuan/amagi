import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliUserSpaceInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 用户空间详细信息（wbi 签名）。
 *
 * 与旧版一致：`getUserSpaceInfo` GET + wbi 签名。
 */
export const userSpaceInfo = defineEndpoint({
  name: 'bilibili.userSpaceInfo',
  route: '/fetch_user_space_info',
  doc: {
    summary: '用户空间详细信息',
    description:
      '走 wbi 签名的 `x/space/wbi/acc/info`：签名器会先打一次 `/nav` 取 keys，30 分钟 TTL 内复用，所以连续调用不会每次都多一个前置请求。' +
      '比 `userCard` 细得多 —— 等级（`level`）、硬币、道德值、VIP、粉丝勋章、铭牌、`live_room` 都在 `data` 里。'
  },
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' }).describe('UP 主 UID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUserSpaceInfo(p) }),
  sign: 'wbi',
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliUserSpaceInfoResponse>()
})
