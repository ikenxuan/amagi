import zod from 'zod'

import type { DouyinEmojiListResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { douyinBogus } from '../sign/steps'
import { defineDouyinEndpoint, type } from './define'

/**
 * 表情列表。
 *
 * 2026-10-05 抓包：浏览器的 `emoji/list` 端点段只有 `need_all` 一个，但 tail 是完整的
 * `webid,uifid,verifyFp,fp,msToken,a_bogus` —— 和作品详情同形。早先这里只放
 * `[msToken(184)]`、不签 a_bogus，与真实请求不一致，现按抓包补齐。
 *
 * 端点段为什么只有 `need_all`（而抓包里有一份还带 `publish_video_strategy_type`），
 * 见 `api.ts` 的 `getEmojiList` —— 那个键跟着页面走，不跟着端点走。
 *
 * 不配 `retryOn`：这条是静态资源清单，没见过被风控拦。
 */
export const emojiList = defineDouyinEndpoint({
  name: 'douyin.emojiList',
  route: '/fetch_emoji_list',
  doc: {
    summary: '表情列表',
    description: '返回常规与限时/联名表情的清单；动态表情用 `dynamicEmojiList`。'
  },
  params: zod.object({}),
  build: (_p, ctx) => ({ method: 'GET', url: createDouyinApiUrls(ctx.userAgent).getEmojiList() }),
  sign: douyinBogus(184),
  response: type<DouyinEmojiListResponse>()
})
