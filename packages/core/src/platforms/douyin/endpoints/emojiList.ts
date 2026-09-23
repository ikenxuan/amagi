import zod from 'zod'

import type { DouyinEmojiListResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { defineDouyinEndpoint, type } from './define'

/**
 * 表情列表（无签名）。
 *
 * 与旧版一致：`getEmojiList` GET，**不带签名参数**。
 */
export const emojiList = defineDouyinEndpoint({
  name: 'douyin.emojiList',
  route: '/fetch_emoji_list',
  doc: {
    summary: '表情列表',
    description: '返回常规与限时/联名表情的清单；动态表情用 `dynamicEmojiList`。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: douyinApiUrls.getEmojiList() }),
  sign: false,
  response: type<DouyinEmojiListResponse>()
})
