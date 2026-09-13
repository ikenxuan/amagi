import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinEmojiListResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'

/**
 * 表情列表（无签名）。
 *
 * 与旧版一致：`getEmojiList` GET，**不带签名参数**。
 */
export const emojiList = defineEndpoint({
  name: 'douyin.emojiList',
  route: '/fetch_emoji_list',
  doc: { summary: '表情列表' },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: douyinApiUrls.getEmojiList() }),
  sign: false,
  response: type<DouyinEmojiListResponse>()
})
