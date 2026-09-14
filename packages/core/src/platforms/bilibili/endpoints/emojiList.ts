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
  doc: {
    summary: '表情列表',
    description:
      '`x/emote/user/panel/web`，`business=reply` 与 `web_location=0.0` 写死在 URL 构造里，所以**无参数、无签名**。它是评论区的表情面板接口 —— 真实网络请求，不是本地计算。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getEmojiList() }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliEmojiListResponse>()
})
