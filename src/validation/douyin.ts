import { z } from 'zod'
import { smartPositiveInteger } from './utils'

// 抖音基础验证模式
export const DouyinWorkParamsSchema = z.object({
  methodType: z.enum(['视频作品数据', '图集作品数据', '合辑作品数据', '聚合解析']),
  /** 视频ID、图集ID、合辑ID */
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const DouyinCommentParamsSchema = z.object({
  methodType: z.literal('评论数据'),
  /** 视频ID */
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空'),
  /** 获取的评论数量，默认50 */
  number: smartPositiveInteger('评论数量必须是正整数').optional().default(50),
  /** 游标，作用类似于翻页 */
  cursor: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') {
        return 0 // 默认值
      }
      const num = Number(val)
      return isNaN(num) ? val : num
    },
    z.number().int().min(0).default(0)
  ).optional()
})

export const DouyinSearchParamsSchema = z.object({
  methodType: z.enum(['热点词数据', '搜索数据']),
  /** 搜索词 */
  query: z.string({ required_error: '搜索词不能为空' }).min(1, '搜索词不能为空'),
  /** 搜索数量，默认10 */
  number: smartPositiveInteger('搜索数量必须是正整数').optional().default(10),
  /** 上次搜索的游标值 */
  search_id: z.string().optional()
})

export const DouyinCommentReplyParamsSchema = z.object({
  methodType: z.literal('指定评论回复数据'),
  /** 视频ID */
  aweme_id: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空'),
  /** 评论ID */
  comment_id: z.string({ required_error: '评论ID不能为空' }).min(1, '评论ID不能为空'),
  /** 获取的评论数量，默认5 */
  number: smartPositiveInteger('评论数量必须是正整数').optional().default(5),
  /** 游标，作用类似于翻页 */
  cursor: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') {
        return 0
      }
      const num = Number(val)
      return isNaN(num) ? val : num
    },
    z.number().int().min(0).default(0)
  ).optional()
})

export const DouyinUserParamsSchema = z.object({
  methodType: z.enum(['用户主页数据', '用户主页视频列表数据', '直播间信息数据']),
  /** 用户ID */
  sec_uid: z.string({ required_error: '用户ID不能为空' }).min(1, '用户ID不能为空')
})

export const DouyinMusicParamsSchema = z.object({
  methodType: z.literal('音乐数据'),
  /** 音乐ID */
  music_id: z.string({ required_error: '音乐ID不能为空' }).min(1, '音乐ID不能为空')
})

export const DouyinLiveRoomParamsSchema = z.object({
  methodType: z.literal('直播间信息数据'),
  /** 直播间ID */
  room_id: z.string({ required_error: '直播间ID不能为空' }).min(1, '直播间ID不能为空'),
  /** 直播间真实房间号 */
  web_rid: z.string({ required_error: '直播间真实房间号不能为空' }).min(1, '直播间真实房间号不能为空')
})

export const DouyinQrcodeParamsSchema = z.object({
  methodType: z.literal('申请二维码数据'),
  /** fp指纹 */
  verify_fp: z.string({ required_error: 'fp指纹不能为空' }).min(1, 'fp指纹不能为空')
})

export const DouyinEmojiListParamsSchema = z.object({
  methodType: z.literal('Emoji数据')
})

export const DouyinEmojiProParamsSchema = z.object({
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

// 从 Zod 模式推断 TypeScript 类型
export type DouyinWorkParams = z.infer<typeof DouyinWorkParamsSchema>
export type DouyinCommentParams = z.infer<typeof DouyinCommentParamsSchema>
export type DouyinUserParams = z.infer<typeof DouyinUserParamsSchema>
export type DouyinSearchParams = z.infer<typeof DouyinSearchParamsSchema>
export type DouyinMusicParams = z.infer<typeof DouyinMusicParamsSchema>
export type DouyinLiveRoomParams = z.infer<typeof DouyinLiveRoomParamsSchema>
export type DouyinQrcodeParams = z.infer<typeof DouyinQrcodeParamsSchema>
export type DouyinEmojiListParams = z.infer<typeof DouyinEmojiListParamsSchema>
export type DouyinEmojiProParams = z.infer<typeof DouyinEmojiProParamsSchema>
export type DouyinCommentReplyParams = z.infer<typeof DouyinCommentReplyParamsSchema>

// 方法选项映射类型
export interface DouyinMethodOptionsMap {
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