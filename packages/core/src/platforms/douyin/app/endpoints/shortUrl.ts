import zod from 'zod'

import type { DouyinAppShortUrlResponse } from '../../../../types/generated'
import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'

export const shortUrl = defineAwemeEndpoint({
  name: 'douyin.appShortUrl',
  route: '/app_fetch_short_url',
  doc: { summary: 'App 作品分享短链接', description: '无需账号登录；belong、persist 由内部固定设置。' },
  params: zod.object({
    target: zod.url().describe('待缩短的抖音作品分享地址')
  }),
  build: (p) => appRequest('/shorten/', { target: p.target, belong: 'aweme', persist: 1 }),
  response: type<DouyinAppShortUrlResponse>()
})
