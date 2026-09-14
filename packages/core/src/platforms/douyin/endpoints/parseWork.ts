import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinParseWorkResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'

/**
 * 解析作品（原 `/fetch_one_work` 路径保留）。
 *
 * 5 个作品类型各占一条独立路由：`parseWork` 保留 `/fetch_one_work`，
 * 其余 4 个各占新路径。
 * 与旧版一致：`getWorkDetail` GET + a_bogus 签名，返回原始响应。
 */
export const parseWork = defineEndpoint({
  name: 'douyin.parseWork',
  route: '/fetch_one_work',
  doc: {
    summary: '聚合解析作品数据（自动识别类型）',
    description:
      '五个作品端点（这条与 `videoWork` / `imageAlbumWork` / `slidesWork` / `textWork`）打的是**同一个上游** `getWorkDetail`，' +
      '差别只在路由与声明的响应类型：这条保留旧路由 `/fetch_one_work`，响应类型是聚合的 `DouyinParseWorkResponse`。' +
      '上游走 `www-hj` 边缘（带 `request_source` / `origin_type`）—— `www.douyin.com` 上实测 9/18 被 Argus 拦，换 `www-hj` 后 18/18 通过，' +
      '但只是降低而非消除拦截率。命中 Argus 时**换一整套参数重试**：它按单次请求的 token 组判定、不锁账号，' +
      '重放同一个 `msToken` + `a_bogus` 必然同样被拦，所以必须重新 build + 重新签名。'
  },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID')
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getWorkDetail(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinParseWorkResponse>()
})
