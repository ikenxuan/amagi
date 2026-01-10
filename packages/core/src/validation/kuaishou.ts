import { KuaishouMethodOptionsMap } from 'amagi/types/KuaishouAPIParams'
import zod from 'zod'

/**
 * 快手视频参数验证模式
 */
export const KuaishouVideoParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['VideoInfoParams']> = zod.object({
  methodType: zod.literal('videoWork', { error: 'methodType must be "videoWork"' }),
  photoId: zod.string({ error: 'photoId must be a string' }).min(1, { error: 'photoId cannot be empty' })
})

/**
 * 快手评论参数验证模式
 */
export const KuaishouCommentParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('comments', { error: 'methodType must be "comments"' }),
  photoId: zod.string({ error: 'photoId must be a string' }).min(1, { error: 'photoId cannot be empty' })
})

/**
 * 快手表情参数验证模式
 */
export const KuaishouEmojiParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['EmojiListParams']> = zod.object({
  methodType: zod.literal('emojiList', { error: 'methodType must be "emojiList"' })
})

/**
 * 快手参数验证模式映射
 */
export const KuaishouValidationSchemas = {
  videoWork: KuaishouVideoParamsSchema,
  comments: KuaishouCommentParamsSchema,
  emojiList: KuaishouEmojiParamsSchema
} as const

/**
 * 快手方法路由映射
 */
export const KuaishouMethodRoutes = {
  videoWork: '/fetch_one_work',
  comments: '/fetch_work_comments',
  emojiList: '/fetch_emoji_list'
} as const

export type KuaishouMethodType = keyof typeof KuaishouValidationSchemas
