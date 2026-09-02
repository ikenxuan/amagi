import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { emojiList as buildEmojiList } from '../api'

/**
 * 表情列表（GET，无参数）。
 *
 * v6 的 `EmojiListParams` 只有 `methodType`，没有业务参数 —— v7 用
 * 空对象 schema（`zod.object({})`），fetcher 方法可以不传 options。
 */
export const emojiList = defineEndpoint({
  name: 'xiaohongshu.emojiList',
  route: '/fetch_emoji_list',
  params: zod.object({}),
  build: () => {
    const { Url, apiPath } = buildEmojiList()
    return { method: 'GET', url: Url, signPath: apiPath }
  },
  sign: 'xhs-get',
  response: type<EmojiListData>()
})

/** 表情列表响应 */
export interface EmojiListData {
  code: number
  msg: string
  success: boolean
  data: Array<{ name: string; url: string }>
}
