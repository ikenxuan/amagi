import { SearchNoteType, SearchSortType } from 'amagi/platform/xiaohongshu/API'
import { XiaohongshuMethodOptionsMap } from 'amagi/types/XiaohongshuAPIParams'
import zod from 'zod'

type SearchSortTypeUnion = (typeof SearchSortType)[keyof typeof SearchSortType]
const SearchSortTypeValues = Object.values(SearchSortType).filter((v) => typeof v === 'string') as unknown as readonly [SearchSortTypeUnion, ...SearchSortTypeUnion[]]
const SearchNoteTypeValues = Object.values(SearchNoteType).filter((v) => typeof v === 'number') as [number, ...number[]]

/**
 * 小红书首页推荐数据参数验证模式
 */
const HomeFeedParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['HomeFeedParams']> = zod.object({
  methodType: zod.literal('首页推荐数据', { error: '方法类型必须是"首页推荐数据"' }),
  cursor_score: zod.string({ error: 'cursor_score必须是字符串' }).optional(),
  num: zod.coerce.number({ error: '数量必须是数字' }).int({ error: '数量必须是整数' }).min(1, { error: '数量不能小于1' }).max(100, { error: '数量不能大于100' }).optional(),
  refresh_type: zod.coerce.number({ error: 'refresh_type必须是数字' }).int({ error: 'refresh_type必须是整数' }).optional(),
  note_index: zod.coerce.number({ error: 'note_index必须是数字' }).int({ error: 'note_index必须是整数' }).optional(),
  category: zod.string({ error: 'category必须是字符串' }).optional(),
  search_key: zod.string({ error: 'search_key必须是字符串' }).optional()
})

/**
 * 小红书单个笔记数据参数验证模式
 */
const NoteParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['NoteParams']> = zod.object({
  methodType: zod.literal('单个笔记数据', { error: '方法类型必须是"单个笔记数据"' }),
  note_id: zod.string({ error: 'note_id必须是字符串' }),
  xsec_token: zod.string({ error: 'xsec_token必须是字符串' })
})

/**
 * 小红书评论数据参数验证模式
 */
const CommentParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('评论数据', { error: '方法类型必须是"评论数据"' }),
  note_id: zod.string({ error: 'note_id必须是字符串' }),
  cursor: zod.string({ error: 'cursor必须是字符串' }).optional(),
  xsec_token: zod.string({ error: 'xsec_token必须是字符串' })
})

/**
 * 小红书用户数据参数验证模式
 */
const UserParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['UserParams']> = zod.object({
  methodType: zod.literal('用户数据', { error: '方法类型必须是"用户数据"' }),
  user_id: zod.string({ error: 'user_id必须是字符串' })
})

/**
 * 小红书用户笔记数据参数验证模式
 */
const UserNoteParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['UserNoteParams']> = zod.object({
  methodType: zod.literal('用户笔记数据', { error: '方法类型必须是"用户笔记数据"' }),
  user_id: zod.string({ error: 'user_id必须是字符串' }),
  cursor: zod.string({ error: 'cursor必须是字符串' }).optional(),
  num: zod.coerce.number({ error: '数量必须是数字' }).int({ error: '数量必须是整数' }).min(1, { error: '数量不能小于1' }).max(100, { error: '数量不能大于100' }).optional()
})

const EmojiListParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['EmojiListParams']> = zod.object({
  methodType: zod.literal('表情列表', { error: '方法类型必须是"表情列表"' })
})

/**
 * 小红书搜索笔记参数验证模式
 */
const SearchNoteParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['SearchNoteParams']> = zod.object({
  methodType: zod.literal('搜索笔记', { error: '方法类型必须是"搜索笔记"' }),
  keyword: zod.string({ error: 'keyword必须是字符串' }),
  page: zod.coerce.number({ error: 'page必须是数字' }).int({ error: 'page必须是整数' }).min(1, { error: 'page不能小于1' }).optional(),
  page_size: zod.coerce.number({ error: 'page_size必须是数字' }).int({ error: 'page_size必须是整数' }).min(1, { error: 'page_size不能小于1' }).max(100, { error: 'page_size不能大于100' }).optional(),
  sort: zod.enum(SearchSortTypeValues, { error: '排序类型不合法' }).optional(),
  note_type: zod.coerce.number({ error: '笔记类型必须是数字' }).int({ error: '笔记类型必须是整数' }).refine((val) => SearchNoteTypeValues.includes(val), { message: '笔记类型不合法' }).optional()
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
  搜索笔记: SearchNoteParamsSchema
} as const

/**
 * 小红书方法类型
 */
export const XiaohongshuMethodRoutes = {
  首页推荐数据: '/fetch_home_feed',
  单个笔记数据: '/fetch_one_note',
  评论数据: '/fetch_note_comments',
  用户数据: '/fetch_user_profile',
  用户笔记数据: '/fetch_user_notes',
  表情列表: '/fetch_emoji_list',
  搜索笔记: '/fetch_search_notes'
} as const

export type XiaohongshuMethodType = keyof typeof XiaohongshuValidationSchemas
