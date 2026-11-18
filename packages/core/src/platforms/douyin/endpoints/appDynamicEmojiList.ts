import zod from 'zod'

import { appRequest } from '../aweme/api'
import { defineAwemeEndpoint, type } from '../aweme/define'

export const appDynamicEmojiList = defineAwemeEndpoint({
  name: 'douyin.appDynamicEmojiList',
  route: '/app_fetch_emoji_pro_list',
  doc: {
    summary: 'App 动态表情资源配置',
    description: '实验接口：当前游客身份实测返回用户未登录；不会把 Web 账号 Cookie 发送给 App 服务。'
  },
  params: zod.object({}),
  build: () => appRequest('/aweme/v1/im/strategy/config/', { scenes: '["interactive_resources"]', is_retry: 0 }, true),
  response: type<any>()
})
