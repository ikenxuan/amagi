import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 表情列表（单请求）。
 *
 * 与 v6 的 `emojiList` 一致：`getEmojiList` GET，无签名。
 * 注：PRD 把它列在「纯本地计算」分组下，但 v6 的实际行为是网络请求
 * （`fetchEmojiList 命中表情面板接口` 测试锁死 URL），v7 按 v6 行为搬迁。
 */
export const emojiList = defineEndpoint({
  name: 'bilibili.emojiList',
  route: '/fetch_emoji_list',
  params: zod.object({}),
  build: () => ({ method: 'GET', url: bilibiliApiUrls.getEmojiList() }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['emojiList']>()
})
