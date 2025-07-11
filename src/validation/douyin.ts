import { z } from 'zod'
import { smartPositiveInteger } from './utils'
import { DouyinMethodOptionsMap } from 'amagi/types/DouyinAPIParams'

/**
 * @description 抖音视频作品等请求参数
 */
export type DouyinWorkParams = DouyinMethodOptionsMap['WorkParams']
/**
 * @description 抖音评论数据请求参数
 */
export type DouyinCommentParams = DouyinMethodOptionsMap['CommentParams']
/**
 * @description 抖音搜索相关请求参数
 */
export type DouyinSearchParams = DouyinMethodOptionsMap['SearchParams']
/**
 * @description 抖音指定评论回复数据请求参数
 */
export type DouyinCommentReplyParams = DouyinMethodOptionsMap['CommentReplyParams']
/**
 * @description 抖音用户相关请求参数
 */
export type DouyinUserParams = DouyinMethodOptionsMap['UserParams']
/**
 * @description 抖音音乐数据请求参数
 */
export type DouyinMusicParams = DouyinMethodOptionsMap['MusicParams']
/**
 * @description 抖音直播间信息请求参数
 */
export type DouyinLiveRoomParams = DouyinMethodOptionsMap['LiveRoomParams']
/**
 * @description 抖音申请二维码请求参数
 */
export type DouyinQrcodeParams = DouyinMethodOptionsMap['QrcodeParams']
/**
 * @description 抖音Emoji数据请求参数
 */
export type DouyinEmojiListParams = DouyinMethodOptionsMap['EmojiListParams']
/**
 * @description 抖音动态表情数据请求参数
 */
export type DouyinEmojiProParams = DouyinMethodOptionsMap['EmojiProParams']


// 抖音基础验证模式
export const DouyinWorkParamsSchema: z.ZodType<DouyinWorkParams> = z.object({
  methodType: z.enum(['视频作品数据', '图集作品数据', '合辑作品数据', '聚合解析']),
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const DouyinCommentParamsSchema: z.ZodType<DouyinCommentParams> = z.object({
  methodType: z.literal('评论数据'),
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空'),
  number: smartPositiveInteger('评论数量必须是正整数').optional().default(50),
  cursor: z.coerce.number().int().min(0).default(0).optional()
})

export const DouyinSearchParamsSchema: z.ZodType<DouyinSearchParams> = z.object({
  methodType: z.enum(['热点词数据', '搜索数据']),
  query: z.string({ required_error: '搜索词不能为空' }).min(1, '搜索词不能为空'),
  number: smartPositiveInteger('搜索数量必须是正整数').optional().default(10),
  search_id: z.string().optional()
})

export const DouyinCommentReplyParamsSchema: z.ZodType<DouyinCommentReplyParams> = z.object({
  methodType: z.literal('指定评论回复数据'),
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空'),
  comment_id: z.string({ required_error: '评论ID不能为空' }).min(1, '评论ID不能为空'),
  number: smartPositiveInteger('评论数量必须是正整数').optional().default(5),
  cursor: z.coerce.number().int().min(0).default(0).optional()
})

export const DouyinUserParamsSchema: z.ZodType<DouyinUserParams> = z.object({
  methodType: z.enum(['用户主页数据', '用户主页视频列表数据', '直播间信息数据']),
  sec_uid: z.string({ required_error: '用户ID不能为空' }).min(1, '用户ID不能为空')
})

export const DouyinMusicParamsSchema: z.ZodType<DouyinMusicParams> = z.object({
  methodType: z.literal('音乐数据'),
  music_id: z.string({ required_error: '音乐ID不能为空' }).min(1, '音乐ID不能为空')
})

export const DouyinQrcodeParamsSchema: z.ZodType<DouyinQrcodeParams> = z.object({
  methodType: z.literal('申请二维码数据'),
  verify_fp: z.string({ required_error: 'fp指纹不能为空' }).min(1, 'fp指纹不能为空')
})

export const DouyinEmojiListParamsSchema: z.ZodType<DouyinEmojiListParams> = z.object({
  methodType: z.literal('Emoji数据')
})

export const DouyinEmojiProParamsSchema: z.ZodType<DouyinEmojiProParams> = z.object({
  methodType: z.literal('动态表情数据')
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
  '直播间信息数据': DouyinUserParamsSchema,
  '申请二维码数据': DouyinQrcodeParamsSchema,
  'Emoji数据': DouyinEmojiListParamsSchema,
  '动态表情数据': DouyinEmojiProParamsSchema,
  '指定评论回复数据': DouyinCommentReplyParamsSchema
} as const

export type DouyinMethodType = keyof typeof DouyinValidationSchemas