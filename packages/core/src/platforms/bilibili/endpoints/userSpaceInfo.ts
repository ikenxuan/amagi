import zod from 'zod'

import type { BilibiliUserSpaceInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { wbi } from '../sign/steps'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 用户空间详细信息（wbi 签名）。
 *
 * 与旧版一致：`getUserSpaceInfo` GET + wbi 签名。
 */
export const userSpaceInfo = defineBilibiliEndpoint({
  name: 'bilibili.userSpaceInfo',
  route: '/fetch_user_space_info',
  doc: {
    summary: '用户空间详细信息',
    description: '取用户空间完整资料（等级、硬币、VIP、粉丝勋章等）；名片类信息用 `userCard`。'
  },
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' }).describe('UP 主 UID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUserSpaceInfo(p) }),
  sign: [wbi()],
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliUserSpaceInfoResponse>()
})
