import zod from 'zod'

import type { BilibiliEmojiListResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 表情列表（单请求）。
 *
 * 与旧版一致：`getEmojiList` GET，无签名。
 * 它是网络请求（表情面板接口），不是本地计算。
 */
export const emojiList = defineBilibiliEndpoint({
  name: 'bilibili.emojiList',
  route: '/fetch_emoji_list',
  doc: {
    summary: '表情列表',
    description: '取评论区表情面板里的全部表情，无参数。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getEmojiList() }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliEmojiListResponse>()
})
