import zod from 'zod'

import type { DouyinAppMusicInfoResponse } from '../../../types/generated'
import { appRequest } from '../aweme/api'
import { defineAwemeEndpoint, type } from '../aweme/define'

export const appMusicInfo = defineAwemeEndpoint({
  name: 'douyin.appMusicInfo',
  route: '/app_fetch_music_work',
  doc: { summary: 'App 音乐详细信息', description: '无需账号登录；与 Web 游客音乐接口不同，成功样本包含 music_info.play_url。' },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' }).describe('音乐 ID')
  }),
  build: (p) => appRequest('/aweme/v1/music/detail/', { music_id: p.music_id }),
  response: type<DouyinAppMusicInfoResponse>()
})
