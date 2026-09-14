import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinDynamicEmojiListResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'

/**
 * 动态表情列表（单请求）。
 *
 * 与旧版一致：`getDynamicEmojiList` GET + a_bogus 签名。
 */
export const dynamicEmojiList = defineEndpoint({
  name: 'douyin.dynamicEmojiList',
  route: '/fetch_emoji_pro_list',
  doc: {
    summary: '动态表情列表',
    description:
      '无参数，签名 `a_bogus`。请求里 `scenes` 固定传原始 JSON 字符串 `["interactive_resources"]` —— 必须让拼 URL 时编码一次，' +
      '预先编码过会变成 `%2522`，接口回「参数不合法」（`status_code: 5`）。'
  },
  params: zod.object({}),
  build: () => ({ method: 'GET', url: douyinApiUrls.getDynamicEmojiList() }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinDynamicEmojiListResponse>()
})
