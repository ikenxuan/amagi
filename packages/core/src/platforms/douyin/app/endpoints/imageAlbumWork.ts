import zod from 'zod'

import type { DouyinAppImageAlbumWorkResponse } from '../../../../types/generated'
import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export const imageAlbumWork = defineAwemeEndpoint({
  name: 'douyin.appImageAlbumWork',
  route: '/app_fetch_image_album_work',
  doc: { summary: 'App 图集作品详细信息', description: '无需账号登录，返回 App 原始详情，包含设备签名' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID')
  }),
  build: (p) => appRequest('/aweme/v1/aweme/detail/', { aweme_id: p.aweme_id, origin_type: 0, request_source: 0 }),
  response: type<DouyinAppImageAlbumWorkResponse>()
})
