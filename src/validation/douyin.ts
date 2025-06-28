import { z } from 'zod'

// 抖音基础验证模式 - 确保与DouyinMethodOptionsMap兼容
export const DouyinWorkParamsSchema = z.object({
  methodType: z.enum(['视频作品数据', '图集作品数据', '合辑作品数据', '聚合解析']),
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const DouyinCommentParamsSchema = z.object({
  methodType: z.literal('评论数据'),
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空'),
  number: z.coerce.number().int().positive().optional().default(50),
  cursor: z.coerce.number().int().min(0).optional().default(0)
})

export const DouyinUserParamsSchema = z.object({
  methodType: z.enum(['用户主页数据', '用户主页视频列表数据']),
  sec_uid: z.string({ required_error: '用户ID不能为空' }).min(1, '用户ID不能为空')
})

export const DouyinSearchParamsSchema = z.object({
  methodType: z.enum(['热点词数据', '搜索数据']),
  query: z.string({ required_error: '搜索词不能为空' }).min(1, '搜索词不能为空'),
  number: z.number().int().positive().optional().default(10),
  search_id: z.string().optional()
})

export const DouyinMusicParamsSchema = z.object({
  methodType: z.literal('音乐数据'),
  music_id: z.string({ required_error: '音乐ID不能为空' }).min(1, '音乐ID不能为空')
})

export const DouyinLiveRoomParamsSchema = z.object({
  methodType: z.literal('直播间信息数据'),
  sec_uid: z.string({ required_error: '用户ID不能为空' }).min(1, '用户ID不能为空')
})

export const DouyinQrcodeParamsSchema = z.object({
  methodType: z.literal('申请二维码数据'),
  verify_fp: z.string({ required_error: 'fp指纹不能为空' }).min(1, 'fp指纹不能为空')
})

export const DouyinEmojiListParamsSchema = z.object({
  methodType: z.literal('Emoji数据')
})

export const DouyinEmojiProParamsSchema = z.object({
  methodType: z.literal('动态表情数据')
})

export const DouyinCommentReplyParamsSchema = z.object({
  methodType: z.literal('指定评论回复数据'),
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空'),
  comment_id: z.string({ required_error: '评论ID不能为空' }).min(1, '评论ID不能为空'),
  number: z.number().int().positive().optional().default(5),
  cursor: z.number().int().min(0).optional().default(0)
})

// 抖音参数验证模式映射
export const DouyinValidationSchemas = {
  '聚合解析': DouyinWorkParamsSchema,
  '视频作品数据': DouyinWorkParamsSchema,
  '图集作品数据': DouyinWorkParamsSchema,
  '合辑作品数据': DouyinWorkParamsSchema,
  '评论数据': DouyinCommentParamsSchema,
  '用户主页数据': DouyinUserParamsSchema,
  '用户主页视频列表数据': DouyinUserParamsSchema,
  '热点词数据': DouyinSearchParamsSchema,
  '搜索数据': DouyinSearchParamsSchema,
  '音乐数据': DouyinMusicParamsSchema,
  '直播间信息数据': DouyinLiveRoomParamsSchema,
  '申请二维码数据': DouyinQrcodeParamsSchema,
  'Emoji数据': DouyinEmojiListParamsSchema,
  '动态表情数据': DouyinEmojiProParamsSchema,
  '指定评论回复数据': DouyinCommentReplyParamsSchema
} as const

export type DouyinMethodType = keyof typeof DouyinValidationSchemas