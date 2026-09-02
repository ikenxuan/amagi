import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import { kuaishouApiUrls } from '../api'

/**
 * 获取表情列表（graphql POST，无参数）。
 */
export const emojiList = defineEndpoint({
  name: 'kuaishou.emojiList',
  route: '/fetch_emoji_list',
  params: zod.object({}),
  build: () => {
    const req = kuaishouApiUrls.emojiList()
    return { method: 'POST', url: req.url, body: req.body, headers: { 'Content-Type': 'application/json' } }
  },
  response: type<KuaishouReturnTypeMap['emojiList']>()
})
