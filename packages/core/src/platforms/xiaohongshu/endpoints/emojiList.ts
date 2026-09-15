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
    description: '取小红书表情列表，无参数。'
  },
  params: zod.object({}),
  build: () => {
    const { Url, apiPath } = buildEmojiList()
    return { method: 'GET', url: Url, signPath: apiPath }
  },
  sign: 'xhs-get',
  response: type<XiaohongshuEmojiListResponse>()
})
