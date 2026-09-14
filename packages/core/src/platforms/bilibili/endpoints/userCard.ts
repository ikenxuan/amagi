import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliUserCardResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 用户名片信息（单请求）。
 *
 * 与旧版一致：`getUserCard` GET，无签名。
 */
export const userCard = defineEndpoint({
  name: 'bilibili.userCard',
  route: '/fetch_user_profile',
  doc: {
    summary: '用户名片信息',
    description:
      '`x/web-interface/card`（`photo=true` 写死在 URL 里）。`data.card` 是名片本体（昵称、头像、签名、等级、认证），边上另带 `follower` / `archive_count` / `article_count` / `like_num` 统计。' +
      '无签名；要粉丝勋章、铭牌、VIP、`live_room` 这类更细的资料用 `userSpaceInfo`（那条走 wbi）。'
  },
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' }).describe('UP 主 UID')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getUserCard(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliUserCardResponse>()
})
