import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import { kuaishouApiUrls } from '../api'

/**
 * 获取单个作品信息（graphql POST）。
 *
 * v6 的 `fetchVideoWork` 走 `https://www.kuaishou.com/graphql`，
 * body 是 `{ operationName, variables, query }`。graphql 响应没有
 * `result=1` 这类快手 live_api 判定，直接透传给 judge —— 快手
 * graphql 用 `data.<operationName>` 承载结果。
 */
export const videoWork = defineEndpoint({
  name: 'kuaishou.videoWork',
  route: '/fetch_one_work',
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' })
  }),
  build: (p) => {
    const req = kuaishouApiUrls.videoWork(p)
    return { method: 'POST', url: req.url, body: req.body, headers: { 'Content-Type': 'application/json' } }
  },
  response: type<KuaishouReturnTypeMap['videoWork']>()
})
