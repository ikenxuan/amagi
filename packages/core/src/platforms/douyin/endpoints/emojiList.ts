import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { douyinApiUrls } from '../api'

/**
 * 表情列表（无签名）。
 *
 * 与 v6 的 `emojiList` 一致：`getEmojiList` GET，**不带签名参数**
 * （v6 的 fetchEmojiList 测试锁死 `a_bogus` 为 undefined）。
 */
export const emojiList = defineEndpoint({
  name: 'douyin.emojiList',
  route: '/fetch_emoji_list',
  params: zod.object({}),
  build: () => ({ method: 'GET', url: douyinApiUrls.getEmojiList() }),
  sign: false,
  response: type<EmojiListData>()
})

/** 表情列表响应（与 v6 形状一致的最小声明） */
export interface EmojiListData {
  emoji_list?: unknown[]
  [key: string]: unknown
}
