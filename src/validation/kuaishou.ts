import { z } from 'zod'

// 快手基础验证模式
export const KuaishouVideoParamsSchema = z.object({
  methodType: z.literal('单个视频作品数据'),
  /** 作品ID */
  photoId: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const KuaishouCommentParamsSchema = z.object({
  methodType: z.literal('评论数据'),
  /** 作品ID */
  photoId: z.string({ required_error: '视频ID不能为空' }).min(1, '视频ID不能为空')
})

export const KuaishouEmojiParamsSchema = z.object({
  methodType: z.literal('Emoji数据')
})

// 快手参数验证模式映射
export const KuaishouValidationSchemas = {
  '单个视频作品数据': KuaishouVideoParamsSchema,
  '评论数据': KuaishouCommentParamsSchema,
  'Emoji数据': KuaishouEmojiParamsSchema
} as const

// 从 Zod 模式推断 TypeScript 类型
export type KuaishouVideoParams = z.infer<typeof KuaishouVideoParamsSchema>
export type KuaishouCommentParams = z.infer<typeof KuaishouCommentParamsSchema>
export type KuaishouEmojiParams = z.infer<typeof KuaishouEmojiParamsSchema>

// 方法选项映射类型
export interface KuaishouMethodOptionsMap {
  VideoInfoParams: KuaishouVideoParams
  CommentParams: KuaishouCommentParams
  EmojiListParams: KuaishouEmojiParams
}

export type KuaishouMethodType = keyof typeof KuaishouValidationSchemas