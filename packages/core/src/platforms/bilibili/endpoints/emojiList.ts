import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliEmojiListResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 表情列表（单请求）。
 *
 * 与旧版一致：`getEmojiList` GET，无签名。
 * 它是网络请求（表情面板接口），不是本地计算。
 */
export const emojiList = defineEndpoint({
  name: 'bilibili.emojiList',
  route: '/fetch_emoji_list',
  doc: { summary: '表情列表' },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getEmojiList() }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliEmojiListResponse>()
})
