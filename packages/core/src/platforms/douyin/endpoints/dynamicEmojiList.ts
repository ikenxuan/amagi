import zod from 'zod'

import type { DouyinDynamicEmojiListResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

/**
 * 动态表情列表（单请求）。
 *
 * `getDynamicEmojiList` GET + a_bogus 签名。msToken 取 184 而非 116：2026-10-05 抓包里
 * 浏览器的 `im/strategy/config` 发的是 184 位，与其余 `/aweme/v1/web/*` 一致。
 */
export const dynamicEmojiList = defineDouyinEndpoint({
  name: 'douyin.dynamicEmojiList',
  route: '/fetch_emoji_pro_list',
  doc: {
    summary: '动态表情列表',
    description: '返回动态表情资源；常规表情列表用 `emojiList`。'
  },
  params: zod.object({}),
  build: (_p, ctx) => ({ method: 'GET', url: createDouyinApiUrls(ctx.userAgent).getDynamicEmojiList() }),
  sign: douyinBogus(184),
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  response: type<DouyinDynamicEmojiListResponse>()
})
