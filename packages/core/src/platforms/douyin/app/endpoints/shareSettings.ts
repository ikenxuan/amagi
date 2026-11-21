import zod from 'zod'

import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export interface DouyinAppShareSettingsData {
  status_code: number | string
  command_patterns?: string[] | null
}

export const shareSettings = defineAwemeEndpoint({
  name: 'douyin.appShareSettings',
  route: '/app_fetch_share_settings',
  doc: { summary: 'App 分享口令匹配规则', description: '返回 command_patterns，规则格式由抖音 App 服务端提供。' },
  params: zod.object({}),
  build: () => ({ ...appRequest('/aweme/v2/platform/share/settings/'), responseType: 'json' }),
  response: type<DouyinAppShareSettingsData>()
})
