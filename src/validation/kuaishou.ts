import { KuaishouMethodOptionsMap } from 'amagi/types/KuaishouAPIParams'
import zod from 'zod'

export const KuaishouVideoParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['VideoInfoParams']> = zod.object({
  methodType: zod.literal('单个视频作品数据', { error: '方法类型必须是"单个视频作品数据"' }),
  photoId: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' })
})

export const KuaishouCommentParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('评论数据', { error: '方法类型必须是"评论数据"' }),
  photoId: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' })
})

export const KuaishouEmojiParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['EmojiListParams']> = zod.object({
  methodType: zod.literal('Emoji数据', { error: '方法类型必须是"Emoji数据"' })
})

// 快手参数验证模式映射
export const KuaishouValidationSchemas = {
  单个视频作品数据: KuaishouVideoParamsSchema,
  评论数据: KuaishouCommentParamsSchema,
  Emoji数据: KuaishouEmojiParamsSchema
} as const

export const KuaishouMethodRoutes = {
  单个视频作品数据: '/fetch_one_work',
  评论数据: '/fetch_work_comments',
  Emoji数据: '/fetch_emoji_list'
} as const

export type KuaishouMethodType = keyof typeof KuaishouValidationSchemas
