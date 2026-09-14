import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { KuaishouEmojiListResponse } from '../../../types/generated'
import { kuaishouApiUrls } from '../api'

/**
 * 获取表情列表（graphql POST，无参数）。
 *
 * 这条**保持走 PC GraphQL**，没跟着 videoWork / comments 换到 H5：
 * `visionBaseEmoticons` 与弹幕的 `visionDanmaku` 一样是**完全免鉴权**的
 * （不需要签名、cookie 或 token），换过去没有收益。
 *
 * 也正因为它零凭证，它是「无 cookie 能不能取到数」的**基线探针** ——
 * 这条通而 videoWork 不通，问题就在签名或 did，不在网络环境。
 */
export const emojiList = defineEndpoint({
  name: 'kuaishou.emojiList',
  route: '/fetch_emoji_list',
  doc: {
    summary: '表情列表',
    description:
      'PC GraphQL `visionBaseEmoticons`，**完全免鉴权**（不需要签名、cookie 或 token），无参数。' +
      '因为没有凭证要求，它也是排查「无 cookie 能不能取到数」的基线探针 —— 这条通而 `videoWork` 不通，问题就在签名或 did，不在网络环境。'
  },
  params: zod.object({}),
  build: () => {
    const req = kuaishouApiUrls.emojiList()
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      // Referer 显式给出：基线里那个 `/new-reco` 是首页推荐页，与 graphql 请求
      // 的实际来源无关，靠它「碰巧能用」不是可依赖的前提
      headers: { 'Content-Type': 'application/json', Referer: 'https://www.kuaishou.com/new-reco' }
    }
  },
  response: type<KuaishouEmojiListResponse>()
})
