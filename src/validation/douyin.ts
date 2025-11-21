import { DouyinMethodOptionsMap } from 'amagi/types/DouyinAPIParams'
import zod from 'zod'

import { smartPositiveInteger } from './utils'

export const DouyinWorkParamsSchema: zod.ZodType<DouyinMethodOptionsMap['WorkParams']> = zod.object({
  methodType: zod.enum(['视频作品数据', '图集作品数据', '合辑作品数据', '聚合解析'], {
    error: '方法类型必须是指定的枚举值之一'
  }),
  aweme_id: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' })
})

export const DouyinCommentParamsSchema: zod.ZodType<DouyinMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('评论数据', { error: '方法类型必须是"评论数据"' }),
  aweme_id: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' }),
  number: smartPositiveInteger('评论数量必须是正整数').optional().default(50),
  cursor: zod.coerce.number({ error: '游标必须是数字' }).int({ error: '游标必须是整数' }).min(0, { error: '游标不能小于0' }).default(0).optional()
})

export const DouyinHotWordsParamsSchema: zod.ZodType<DouyinMethodOptionsMap['HotWordsParams']> = zod.object({
  methodType: zod.literal('热点词数据', {
    error: '方法类型必须是"热点词数据"'
  }),
  query: zod.string({ error: '搜索词必须是字符串' }).min(1, { error: '搜索词不能为空' })
})

export const DouyinSearchParamsSchema: zod.ZodType<DouyinMethodOptionsMap['SearchParams']> = zod.object({
  methodType: zod.literal('搜索数据', {
    error: '方法类型必须是"搜索数据"'
  }),
  query: zod.string({ error: '搜索词必须是字符串' }).min(1, { error: '搜索词不能为空' }),
  type: zod.enum(['综合', '用户', '视频'], {
    error: '搜索类型必须是"综合"、"用户"或"视频"'
  }).optional().default('综合'),
  number: smartPositiveInteger('搜索数量必须是正整数').optional().default(10),
  search_id: zod.string({ error: '搜索ID必须是字符串' }).optional()
})

export const DouyinCommentReplyParamsSchema: zod.ZodType<DouyinMethodOptionsMap['CommentReplyParams']> = zod.object({
  methodType: zod.literal('指定评论回复数据', { error: '方法类型必须是"指定评论回复数据"' }),
  aweme_id: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' }),
  comment_id: zod.string({ error: '评论ID必须z串' }).min(1, { error: '评论ID不能为空' }),
  number: smartPositiveInteger('评论数量必须是正整数').optional().default(5),
  cursor: zod.coerce.number({ error: '游标必须是数字' }).int({ error: '游标必须是整数' }).min(0, { error: '游标不能小于0' }).default(0).optional()
})

export const DouyinUserParamsSchema: zod.ZodType<DouyinMethodOptionsMap['UserParams']> = zod.object({
  methodType: zod.enum(['用户主页数据', '用户主页视频列表数据'], {
    error: '方法类型必须是指定的枚举值之一'
  }),
  sec_uid: zod.string({ error: '用户ID必须是字符串' }).min(1, { error: '用户ID不能为空' })
})

export const DouyinMusicParamsSchema: zod.ZodType<DouyinMethodOptionsMap['MusicParams']> = zod.object({
  methodType: zod.literal('音乐数据', { error: '方法类型必须是"音乐数据"' }),
  music_id: zod.string({ error: '音乐ID必须是字符串' }).min(1, { error: '音乐ID不能为空' })
})

export const DouyinLiveRoomParamsSchema: zod.ZodType<DouyinMethodOptionsMap['LiveRoomParams']> = zod.object({
  methodType: zod.literal('直播间信息数据', { error: '方法类型必须是"直播间信息数据"' }),
  web_rid: zod.string({ error: '直播间ID必须是字符串' }).min(1, { error: '直播间ID不能为空' }),
  room_id: zod.string({ error: '直播间ID必须是字符串' }).min(1, { error: '直播间ID不能为空' })
})

export const DouyinQrcodeParamsSchema: zod.ZodType<DouyinMethodOptionsMap['QrcodeParams']> = zod.object({
  methodType: zod.literal('申请二维码数据', { error: '方法类型必须是"申请二维码数据"' }),
  verify_fp: zod.string({ error: 'fp指纹必须是字符串' }).min(1, { error: 'fp指纹不能为空' })
})

export const DouyinEmojiListParamsSchema: zod.ZodType<DouyinMethodOptionsMap['EmojiListParams']> = zod.object({
  methodType: zod.literal('Emoji数据', { error: '方法类型必须是"Emoji数据"' })
})

export const DouyinEmojiProParamsSchema: zod.ZodType<DouyinMethodOptionsMap['EmojiProParams']> = zod.object({
  methodType: zod.literal('动态表情数据', { error: '方法类型必须是"动态表情数据"' })
})

export const DouyinDanmakuParamsSchema: zod.ZodType<DouyinMethodOptionsMap['DanmakuParams']> = zod.object({
  methodType: zod.literal('弹幕数据', { error: '方法类型必须是"弹幕数据"' }),
  aweme_id: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' }),
  start_time: zod.coerce.number({ error: '开始时间必须是数字' }).int({ error: '开始时间必须是整数' }).min(0, { error: '开始时间不能小于0' }).optional(),
  end_time: zod.coerce.number({ error: '结束时间必须是数字' }).int({ error: '结束时间必须是整数' }).min(0, { error: '结束时间不能小于0' }).optional(),
  duration: zod.coerce.number({ error: '视频时长必须是数字' }).int({ error: '视频时长必须是整数' }).min(0, { error: '视频时长不能小于0' })
}).refine(
  (data) => {
    if (data.end_time !== undefined) {
      return data.end_time <= data.duration
    }
    return true
  },
  {
    error: '获取弹幕区间的结束时间不能超过视频总时长',
    path: ['end_time']
  }
).refine(
  (data) => {
    if (data.start_time !== undefined && data.end_time !== undefined) {
      return data.start_time < data.end_time
    }
    return true
  },
  {
    error: '获取弹幕区间的开始时间必须小于结束时间',
    path: ['start_time']
  }
)

// 抖音参数验证模式映射
export const DouyinValidationSchemas = {
  文字作品数据: DouyinWorkParamsSchema,
  聚合解析: DouyinWorkParamsSchema,
  视频作品数据: DouyinWorkParamsSchema,
  图集作品数据: DouyinWorkParamsSchema,
  合辑作品数据: DouyinWorkParamsSchema,
  评论数据: DouyinCommentParamsSchema,
  用户主页数据: DouyinUserParamsSchema,
  用户主页视频列表数据: DouyinUserParamsSchema,
  热点词数据: DouyinHotWordsParamsSchema,
  搜索数据: DouyinSearchParamsSchema,
  音乐数据: DouyinMusicParamsSchema,
  直播间信息数据: DouyinLiveRoomParamsSchema,
  申请二维码数据: DouyinQrcodeParamsSchema,
  Emoji数据: DouyinEmojiListParamsSchema,
  动态表情数据: DouyinEmojiProParamsSchema,
  指定评论回复数据: DouyinCommentReplyParamsSchema,
  弹幕数据: DouyinDanmakuParamsSchema
} as const

export const DouyinMethodRoutes = {
  聚合解析: '/fetch_one_work',
  文字作品数据: '/fetch_one_work',
  视频作品数据: '/fetch_one_work',
  图集作品数据: '/fetch_one_work',
  合辑作品数据: '/fetch_one_work',
  评论数据: '/fetch_work_comments',
  用户主页数据: '/fetch_user_info',
  用户主页视频列表数据: '/fetch_user_post_videos',
  搜索数据: '/fetch_search_info',
  热点词数据: '/fetch_suggest_words',
  音乐数据: '/fetch_music_work',
  Emoji数据: '/fetch_emoji_list',
  动态表情数据: '/fetch_emoji_pro_list',
  直播间信息数据: '/fetch_user_live_videos',
  指定评论回复数据: '/fetch_video_comment_replies',
  弹幕数据: '/fetch_work_danmaku'
} as const

export type DouyinMethodType = keyof typeof DouyinValidationSchemas
