import { SearchSortType, SearchNoteType } from 'amagi/platform/xiaohongshu/API'
import { z } from 'zod'

// 兼容 Zod v4：用枚举值构建 z.enum 来替代已弃用的 z.nativeEnum
const SearchSortTypeValues = Object.values(SearchSortType).filter((v) => typeof v === 'string') as [string, ...string[]]
const SearchNoteTypeValues = Object.values(SearchNoteType).filter((v) => typeof v === 'number') as [number, ...number[]]

/**
 * 小红书首页推荐数据参数验证模式
 */
const HomeFeedParamsSchema = z.object({
  methodType: z.literal('首页推荐数据', { error: '方法类型必须是"首页推荐数据"' }),
  cursor_score: z.string({ error: 'cursor_score必须是字符串' }).optional(),
  num: z.coerce.number({ error: '数量必须是数字' }).int({ error: '数量必须是整数' }).min(1, { error: '数量不能小于1' }).max(100, { error: '数量不能大于100' }).optional(),
  refresh_type: z.coerce.number({ error: 'refresh_type必须是数字' }).int({ error: 'refresh_type必须是整数' }).optional(),
  note_index: z.coerce.number({ error: 'note_index必须是数字' }).int({ error: 'note_index必须是整数' }).optional(),
  category: z.string({ error: 'category必须是字符串' }).optional(),
  search_key: z.string({ error: 'search_key必须是字符串' }).optional(),
})

/**
 * 小红书单个笔记数据参数验证模式
 */
const NoteParamsSchema = z.object({
  methodType: z.literal('单个笔记数据', { error: '方法类型必须是"单个笔记数据"' }),
  note_id: z.string({ error: 'note_id必须是字符串' }),
  xsec_token: z.string({ error: 'xsec_token必须是字符串' }),
})

/**
 * 小红书评论数据参数验证模式
 */
const CommentParamsSchema = z.object({
  methodType: z.literal('评论数据', { error: '方法类型必须是"评论数据"' }),
  note_id: z.string({ error: 'note_id必须是字符串' }),
  cursor: z.string({ error: 'cursor必须是字符串' }).optional(),
  xsec_token: z.string({ error: 'xsec_token必须是字符串' }),
})

/**
 * 小红书用户数据参数验证模式
 */
const UserParamsSchema = z.object({
  methodType: z.literal('用户数据', { error: '方法类型必须是"用户数据"' }),
  user_id: z.string({ error: 'user_id必须是字符串' })
})

/**
 * 小红书用户笔记数据参数验证模式
 */
const UserNoteParamsSchema = z.object({
  methodType: z.literal('用户笔记数据', { error: '方法类型必须是"用户笔记数据"' }),
  user_id: z.string({ error: 'user_id必须是字符串' }),
  cursor: z.string({ error: 'cursor必须是字符串' }).optional(),
  num: z.coerce.number({ error: '数量必须是数字' }).int({ error: '数量必须是整数' }).min(1, { error: '数量不能小于1' }).max(100, { error: '数量不能大于100' }).optional(),
})

const EmojiListParamsSchema = z.object({
  methodType: z.literal('表情列表', { error: '方法类型必须是"表情列表"' }),
})

/**
 * 小红书搜索笔记参数验证模式
 */
const SearchNoteParamsSchema = z.object({
  methodType: z.literal('搜索笔记', { error: '方法类型必须是"搜索笔记"' }),
  keyword: z.string({ error: 'keyword必须是字符串' }),
  page: z.coerce.number({ error: 'page必须是数字' }).int({ error: 'page必须是整数' }).min(1, { error: 'page不能小于1' }).optional(),
  page_size: z.coerce.number({ error: 'page_size必须是数字' }).int({ error: 'page_size必须是整数' }).min(1, { error: 'page_size不能小于1' }).max(100, { error: 'page_size不能大于100' }).optional(),
  sort: z.enum(SearchSortTypeValues, { error: '排序类型不合法' }).optional(),
  note_type: z.coerce.number({ error: '笔记类型必须是数字' }).int({ error: '笔记类型必须是整数' }).refine((val) => SearchNoteTypeValues.includes(val), { message: '笔记类型不合法' }).optional(),
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
  表情列表: EmojiListParamsSchema,
  搜索笔记: SearchNoteParamsSchema,
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