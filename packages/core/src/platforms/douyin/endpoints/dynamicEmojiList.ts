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
  doc: { summary: '动态表情列表' },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: douyinApiUrls.getDynamicEmojiList() }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦（#188）
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinReturnTypeMap['dynamicEmojiList']>()
})
