import zod from 'zod'

import type { DouyinAppMusicAwemeListResponse } from '../../../../types/generated'
import { appRequest, uniqueAppItems } from '../api'
import { defineAwemeEndpoint, internalParam, type } from '../define'

export const musicAwemeList = defineAwemeEndpoint({
  name: 'douyin.appMusicAwemeList',
  route: '/app_fetch_music_aweme_list',
  doc: { summary: 'App 音乐作品列表', description: '使用 douyin.app.signerBaseUrl 配置的签名服务；设备与环境参数由内部处理。' },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' }).describe('音乐 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('目标条数，默认 20'),
    cursor: internalParam(zod.coerce.number().int().min(0).optional())
  }),
  build: (p) => appRequest('/aweme/v1/music/aweme/', { music_id: p.music_id, cursor: p.cursor ?? 0, count: p.number ?? 20 }),
  partial: 'tolerate',
  paginate: {
    maxPageSize: 20,
    itemKey: 'aweme_id',
    items: (page) => page.aweme_list ?? [],
    hasMore: (page) => page.has_more === 1,
    nextParams: (params, page) => ({ ...params, cursor: page.cursor }),
    merge: ({ lastPage, items }) => ({ ...lastPage, aweme_list: uniqueAppItems(items, 'aweme_id') })
  },
  response: type<DouyinAppMusicAwemeListResponse>()
})
