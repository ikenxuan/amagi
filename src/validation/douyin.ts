import { z } from 'zod'
import { smartPositiveInteger } from './utils'

/**
 * @description 抖音视频作品等请求参数
 */
export type DouyinWorkParams = {
  /** 视频ID、图集ID、合辑ID */
  aweme_id: string
  /** 方法类型 */
  methodType: '视频作品数据' | '图集作品数据' | '合辑作品数据' | '聚合解析'
}

/**
 * @description 抖音评论数据请求参数
 */
export type DouyinCommentParams = {
  /** 方法类型 */
  methodType: '评论数据'
  /** 视频ID */
  aweme_id: string
  /** 获取的评论数量，默认50 */
  number?: number
  /** 游标，作用类似于翻页 */
  cursor?: number
}

/**
 * @description 抖音搜索相关请求参数
 */
export type DouyinSearchParams = {
  /** 方法类型 */
  methodType: '热点词数据' | '搜索数据'
  /** 搜索词 */
  query: string
  /** 搜索数量，默认10 */
  number?: number
  /** 上次搜索的游标值 */
  search_id?: string
}

/**
 * @description 抖音指定评论回复数据请求参数
 */
export type DouyinCommentReplyParams = {
  /** 方法类型 */
  methodType: '指定评论回复数据'
  /** 视频ID */
  aweme_id: string
  /** 评论ID */
  comment_id: string
  /** 获取的评论数量，默认5 */
  number?: number
  /** 游标，作用类似于翻页 */
  cursor?: number
}

/**
 * @description 抖音用户相关请求参数
 */
export type DouyinUserParams = {
  /** 方法类型 */
  methodType: '用户主页数据' | '用户主页视频列表数据' | '直播间信息数据'
  /** 用户ID */
  sec_uid: string
}

/**
 * @description 抖音音乐数据请求参数
 */
export type DouyinMusicParams = {
  /** 方法类型 */
  methodType: '音乐数据'
  /** 音乐ID */
  music_id: string
}

/**
 * @description 抖音直播间信息请求参数
 */
export type DouyinLiveRoomParams = {
  /** 方法类型 */
  methodType: '直播间信息数据'
  /** 直播间ID */
  room_id: string
  /** 直播间真实房间号 */
  web_rid: string
}

/**
 * @description 抖音申请二维码请求参数
 */
export type DouyinQrcodeParams = {
  /** 方法类型 */
  methodType: '申请二维码数据'
  /** fp指纹 */
  verify_fp: string
}

/**
 * @description 抖音Emoji数据请求参数
 */
export type DouyinEmojiListParams = {
  /** 方法类型 */
  methodType: 'Emoji数据'
}

/**
 * @description 抖音动态表情数据请求参数
 */
export type DouyinEmojiProParams = {
  /** 方法类型 */
  methodType: '动态表情数据'
}

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

export const DouyinLiveRoomParamsSchema: z.ZodType<DouyinLiveRoomParams> = z.object({
  methodType: z.literal('直播间信息数据'),
  room_id: z.string({ required_error: '直播间ID不能为空' }).min(1, '直播间ID不能为空'),
  web_rid: z.string({ required_error: '直播间真实房间号不能为空' }).min(1, '直播间真实房间号不能为空')
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
  '直播间信息数据': DouyinLiveRoomParamsSchema,
  '申请二维码数据': DouyinQrcodeParamsSchema,
  'Emoji数据': DouyinEmojiListParamsSchema,
  '动态表情数据': DouyinEmojiProParamsSchema,
  '指定评论回复数据': DouyinCommentReplyParamsSchema
} as const

// 方法选项映射类型
export type DouyinMethodOptionsMap = {
  CommentReplyParams: DouyinCommentReplyParams
  UserParams: DouyinUserParams
  WorkParams: DouyinWorkParams
  CommentParams: DouyinCommentParams
  MusicParams: DouyinMusicParams
  LiveRoomParams: DouyinLiveRoomParams
  QrcodeParams: DouyinQrcodeParams
  SearchParams: DouyinSearchParams
  EmojiListParams: DouyinEmojiListParams
  EmojiProParams: DouyinEmojiProParams
  VideoWorkParams: DouyinWorkParams
  ImageAlbumWorkParams: DouyinWorkParams
  SlidesWorkParams: DouyinWorkParams
}

export type DouyinMethodType = keyof typeof DouyinValidationSchemas