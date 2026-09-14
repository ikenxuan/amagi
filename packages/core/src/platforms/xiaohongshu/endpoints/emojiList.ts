import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { XiaohongshuEmojiListResponse } from '../../../types/generated'
import { emojiList as buildEmojiList } from '../api'

/**
 * 表情列表（GET，无参数）。
 *
 * 没有业务参数 —— 用空对象 schema（`zod.object({})`），
 * fetcher 方法可以不传 options。
 */
export const emojiList = defineEndpoint({
  name: 'xiaohongshu.emojiList',
  route: '/fetch_emoji_list',
  doc: {
    summary: '表情列表',
    description:
      '没有业务参数 —— 用空对象 schema（`zod.object({})`），fetcher 方法可以不传 options。' +
      '仍然走 `xhs-get` 签名（需要 cookie 里的 `a1`），但请求里不带 `xsec_token`：这条打的是 `/api/im/redmoji/detail`（IM 侧），与笔记 / 评论那几条不同。'
  },
  params: zod.object({}),
  build: () => {
    const { Url, apiPath } = buildEmojiList()
    return { method: 'GET', url: Url, signPath: apiPath }
  },
  sign: 'xhs-get',
  response: type<XiaohongshuEmojiListResponse>()
})
