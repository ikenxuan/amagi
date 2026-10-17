import zod from 'zod'

import type { XiaohongshuLiveSquareResponse } from '../../../types/generated'
import { liveSquare as buildLiveSquare } from '../api'
import { defineXiaohongshuEndpoint, type } from './define'

/** 把 SDK 传入的对象和 HTTP query 里的 JSON 字符串归一成同一种对象形状。 */
const extraInfoObject = zod.record(zod.string(), zod.unknown())
const extraInfoJson = zod
  .string()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value) as unknown
    } catch {
      ctx.addIssue({ code: 'custom', message: 'extra_info 必须是有效的 JSON 对象' })
      return zod.NEVER
    }
  })
  .pipe(extraInfoObject)
/**
 * 直播广场推荐流（GET），移植自 v6，无必填参数。
 *
 * 返回推荐直播间。响应只声明有现有证据支撑的字段，未记录的结构保持 unknown。
 */
export const liveSquare = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.liveSquare',
  route: '/fetch_live_square',
  doc: {
    summary: '直播广场',
    description: '取直播广场推荐列表，参数均可选。'
  },
  params: zod.object({
    source: zod.coerce.number().int().optional().describe('来源标识，默认 13'),
    category: zod.string().optional().describe('分类，默认 0（全部）'),
    pre_source: zod.string().optional().describe('前置来源，真机首屏为空'),
    size: zod.coerce.number().int().min(1).max(100).optional().describe('每页数量，默认 27'),
    extra_info: zod
      .union([extraInfoObject, extraInfoJson])
      .optional()
      .describe('附加信息；HTTP query 可传 JSON 字符串，默认 `{"image_formats":["jpg","webp","avif"]}`'),
    cursor_score: zod.string().optional().describe('分页游标分数，翻页时才带')
  }),
  build: (p) => {
    const { Url, apiPath, signParams } = buildLiveSquare(p)
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  sign: 'xhs-live-get',
  response: type<XiaohongshuLiveSquareResponse>()
})
