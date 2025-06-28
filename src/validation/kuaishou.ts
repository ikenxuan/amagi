import { z } from 'zod'

// 快手基础验证模式
export const KuaishouVideoParamsSchema = z.object({
  methodType: z.literal('单个视频作品数据'),
  photoId: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const KuaishouCommentParamsSchema = z.object({
  methodType: z.literal('评论数据'),
  photoId: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const KuaishouEmojiParamsSchema = z.object({
  methodType: z.literal('Emoji数据'),
  emojiId: z.string({ required_error: 'EmojiID不能为空' }).min(1, 'EmojiID不能为空')
})

// 快手参数验证模式映射
export const KuaishouValidationSchemas = {
  '单个视频作品数据': KuaishouVideoParamsSchema,
  '评论数据': KuaishouCommentParamsSchema,
  'Emoji数据': KuaishouEmojiParamsSchema
} as const

export type KuaishouMethodType = keyof typeof KuaishouValidationSchemas