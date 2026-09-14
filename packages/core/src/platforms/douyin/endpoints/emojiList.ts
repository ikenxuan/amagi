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
  doc: {
    summary: '表情列表',
    description:
      '**不签名**（`sign: false`），无参数。请求固定带 `need_all=true`：缺它会只回常规表情（214 个），带上才含限时 / 联名 / 节日表情（371 个）。' +
      '它仍走 `www.douyin.com` 的基线头（含 cookie 与 Referer）—— 「不签名」不等于「免鉴权」，四条免鉴权端点（`guestUserInfo` 等）还会额外 `dropHeaders` 掉 cookie。' +
      '响应不带 `status_code`，平台判定把「缺失」当成功，不会误判成失败。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: douyinApiUrls.getEmojiList() }),
  sign: false,
  response: type<DouyinEmojiListResponse>()
})
