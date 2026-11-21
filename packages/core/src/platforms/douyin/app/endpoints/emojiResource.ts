import zod from 'zod'

import { defineEndpoint, type } from '../../../../contracts/endpoint'
import type { DouyinAppEmojiResourceMetaResponse } from '../../../../types/generated'
import { DOUYIN_ANDROID_UA } from '../../web/config'
import { appRequest } from '../api'

/** 真实请求确认免签；平台与版本必须同时提供，否则会返回成功码但资源为空。 */
export const emojiResource = defineEndpoint({
  name: 'douyin.appEmojiResourceMeta',
  route: '/app_fetch_emoji_resource_meta',
  doc: {
    summary: 'App 表情资源包元信息',
    description:
      '免签且不需要配置签名服务。内部补齐 Android 平台和版本，返回资源版本、MD5 和下载地址；清单需下载资源包后读取 info.json，下载由调用方处理。'
  },
  params: zod.object({
    version_name: zod.string().trim().min(1).optional().describe('目标 APK 版本；未传使用 40.7.0，资源内容随版本变化')
  }),
  build: (p) => ({
    ...appRequest('/aweme/v1/im/resources/emoji/', { device_platform: 'android', version_name: p.version_name ?? '40.7.0' }),
    headers: { 'User-Agent': DOUYIN_ANDROID_UA, Accept: 'application/json' },
    complete: true
  }),
  sign: false,
  response: type<DouyinAppEmojiResourceMetaResponse>()
})
