import { any, z } from 'zod'

/**
 * 小红书首页推荐数据参数验证模式
 */
const HomeFeedParamsSchema = z.object({
  methodType: z.literal('首页推荐数据'),
  cursor_score: z.string().optional(),
  num: z.number().min(1).max(100).optional(),
  refresh_type: z.number().optional(),
  note_index: z.number().optional(),
  category: z.string().optional(),
  search_key: z.string().optional(),
})

/**
 * 小红书单个笔记数据参数验证模式
 */
const NoteParamsSchema = z.object({
  methodType: z.literal('单个笔记数据'),
  note_id: z.string(),
  xsec_token: z.string(),
})

/**
 * 小红书评论数据参数验证模式
 */
const CommentParamsSchema = z.object({
  methodType: z.literal('评论数据'),
  note_id: z.string(),
  cursor: z.string().optional(),
  xsec_token: z.string(),
})

/**
 * 小红书用户数据参数验证模式
 */
const UserParamsSchema = z.object({
  methodType: z.literal('用户数据'),
  user_id: z.string()
})

/**
 * 小红书用户笔记数据参数验证模式
 */
const UserNoteParamsSchema = z.object({
  methodType: z.literal('用户笔记数据'),
  user_id: z.string(),
  cursor: z.string().optional(),
  num: z.number().min(1).max(100).optional(),
})

const EmojiListParamsSchema = z.object({
  methodType: z.literal('表情列表'),
})

/**
 * 小红书验证模式映射
 */
export const XiaohongshuValidationSchemas = {
  首页推荐数据: HomeFeedParamsSchema,
  单个笔记数据: NoteParamsSchema,
  评论数据: CommentParamsSchema,
  用户数据: UserParamsSchema,
  用户笔记数据: UserNoteParamsSchema,
  表情列表: EmojiListParamsSchema
} as const

/**
 * 小红书方法类型
 */
export type XiaohongshuMethodType = keyof typeof XiaohongshuValidationSchemas

/**
 * 验证小红书参数
 * @param methodType - 小红书方法类型
 * @param params - 待验证的参数
 * @returns 验证后的参数
 */
export const validateXiaohongshuParams = <T extends XiaohongshuMethodType> (
  methodType: T,
  params: unknown
) => {
  const schema = XiaohongshuValidationSchemas[methodType]
  const validated = schema.parse(
    typeof params === 'object' && params !== null
      ? { methodType, ...params }
      : { methodType, params }
  )
  return validated
}