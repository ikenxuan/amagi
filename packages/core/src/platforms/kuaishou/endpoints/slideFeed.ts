import zod from 'zod'

import type { KuaishouSlideFeedResponse } from '../../../types/generated'
import { kuaishouApiUrls } from '../api'
import { KUAISHOU_H5_DROP_HEADERS, kuaishouH5Headers } from '../config'
import { defineKuaishouEndpoint, type } from './define'

/**
 * 获取作品的相关推荐（H5 免签 `ugH5App/slide/feed`）。
 *
 * 2026-09-28 实测：不签名、不发 Cookie 头，`{ photoId, authorId }` 即可取到数据。
 *
 * `authorId` 是作者的**数字** `userId`，来自 `videoWork` 响应的 `photo.userId`
 * （不是 `userEid`）。参数收 `number | string`：JSON 里它是数字，但调用方从
 * 别处拿到的常是字符串，两种都原样发出，不在这里做转换。
 *
 * 响应的 `data.feeds` 是**异构数组**（作品项与推荐卡片混排），判别与边界见
 * `KuaishouSlideFeedResponse` 的 JSDoc。
 */
export const slideFeed = defineKuaishouEndpoint({
  name: 'kuaishou.slideFeed',
  route: '/fetch_slide_feed',
  doc: {
    summary: '作品相关推荐',
    description:
      '取某个作品的相关推荐列表。`authorId` 传作者的数字 ID（`videoWork` 响应里的 `photo.userId`）。返回的列表混有推荐卡片，读作品字段前需先判别。'
  },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }).describe('作品 ID'),
    authorId: zod.union([zod.number(), zod.string().min(1)]).describe('作者数字 ID，取自作品响应的 photo.userId')
  }),
  build: (p) => {
    const req = kuaishouApiUrls.slideFeed(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      headers: kuaishouH5Headers(req.referer),
      dropHeaders: KUAISHOU_H5_DROP_HEADERS
    }
  },
  response: type<KuaishouSlideFeedResponse>()
})
