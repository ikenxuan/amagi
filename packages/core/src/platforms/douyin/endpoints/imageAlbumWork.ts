import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinImageAlbumWorkResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'

/**
 * 图集作品详情（新路径 `/fetch_image_album_work`，避免与其他作品类型共用路由）。
 *
 * 行为与旧版一致：`getWorkDetail` GET + a_bogus 签名。
 */
export const imageAlbumWork = defineEndpoint({
  name: 'douyin.imageAlbumWork',
  route: '/fetch_image_album_work',
  doc: {
    summary: '图集作品详细信息',
    description:
      '与 `videoWork` 同一个上游（`getWorkDetail`）、同一套签名与 Argus 重试，区别只在路由与声明的响应类型：这条按**图集**裁成 `DouyinImageAlbumWorkResponse`。' +
      '五个作品端点各占一条路由，是为了让已知作品类型的调用方拿到准确的响应类型，而不是在一条路由上猜。'
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
  response: type<DouyinImageAlbumWorkResponse>()
})
