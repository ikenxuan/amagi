import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 图集作品详情（新路径 `/fetch_image_album_work`，修 #47/#48/#54 的路由冲突）。
 *
 * 行为与 v6 的 `imageAlbumWork` 一致：`getWorkDetail` GET + a_bogus 签名。
 */
export const imageAlbumWork = defineEndpoint({
  name: 'douyin.imageAlbumWork',
  route: '/fetch_image_album_work',
  doc: { summary: '图集作品详细信息' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getWorkDetail(p) }),
  sign: 'a-bogus',
  response: type<DouyinReturnTypeMap['imageAlbumWork']>()
})
