import zod from 'zod'

import type { DouyinDynamicEmojiListResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { douyinBogus } from '../sign/steps'
import { defineDouyinEndpoint, type } from './define'

/**
 * 动态表情列表（单请求）。
 *
 * 与旧版一致：`getDynamicEmojiList` GET + a_bogus 签名。
 */
export const dynamicEmojiList = defineDouyinEndpoint({
  name: 'douyin.dynamicEmojiList',
  route: '/fetch_emoji_pro_list',
  doc: {
    summary: '动态表情列表',
    description: '返回动态表情资源；常规表情列表用 `emojiList`。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: douyinApiUrls.getDynamicEmojiList() }),
  sign: douyinBogus(116),
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinDynamicEmojiListResponse>()
})
