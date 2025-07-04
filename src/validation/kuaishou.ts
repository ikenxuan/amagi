import { KuaishouMethodOptionsMap } from 'amagi/types/KuaishouAPIParams'
import { z } from 'zod'

/**
 * @description 快手单个视频作品请求参数
 */
export type KuaishouVideoParams = KuaishouMethodOptionsMap['VideoInfoParams']
/**
 * @description 快手评论数据请求参数
 */
export type KuaishouCommentParams = KuaishouMethodOptionsMap['CommentParams']
/**
 * @description 快手Emoji数据请求参数
 */
export type KuaishouEmojiParams = KuaishouMethodOptionsMap['EmojiListParams']

// 快手基础验证模式
export const KuaishouVideoParamsSchema: z.ZodType<KuaishouVideoParams> = z.object({
  methodType: z.literal('单个视频作品数据'),
  photoId: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const KuaishouCommentParamsSchema: z.ZodType<KuaishouCommentParams> = z.object({
  methodType: z.literal('评论数据'),
  photoId: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const KuaishouEmojiParamsSchema: z.ZodType<KuaishouEmojiParams> = z.object({
  methodType: z.literal('Emoji数据')
})

// 快手参数验证模式映射
export const KuaishouValidationSchemas = {
  '单个视频作品数据': KuaishouVideoParamsSchema,
  '评论数据': KuaishouCommentParamsSchema,
  'Emoji数据': KuaishouEmojiParamsSchema
} as const

export type KuaishouMethodType = keyof typeof KuaishouValidationSchemas