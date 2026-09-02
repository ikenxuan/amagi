import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 动态表情列表（单请求）。
 *
 * 与 v6 的 `dynamicEmojiList` 一致：`getDynamicEmojiList` GET + a_bogus 签名。
 */
export const dynamicEmojiList = defineEndpoint({
  name: 'douyin.dynamicEmojiList',
  route: '/fetch_emoji_pro_list',
  params: zod.object({}),
  build: () => ({ method: 'GET', url: douyinApiUrls.getDynamicEmojiList() }),
  sign: 'a-bogus',
  response: type<DouyinReturnTypeMap['dynamicEmojiList']>()
})
