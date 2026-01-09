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
  methodType: zod.literal('homeFeed', { error: 'methodType must be "homeFeed"' }),
  cursor_score: zod.string({ error: 'cursor_score must be a string' }).optional(),
  num: zod.coerce.number({ error: 'num must be a number' }).int({ error: 'num must be an integer' }).min(1, { error: 'num cannot be less than 1' }).max(100, { error: 'num cannot be greater than 100' }).optional(),
  refresh_type: zod.coerce.number({ error: 'refresh_type must be a number' }).int({ error: 'refresh_type must be an integer' }).optional(),
  note_index: zod.coerce.number({ error: 'note_index must be a number' }).int({ error: 'note_index must be an integer' }).optional(),
  category: zod.string({ error: 'category must be a string' }).optional(),
  search_key: zod.string({ error: 'search_key must be a string' }).optional()
})

/**
 * 小红书单个笔记数据参数验证模式
 */
const NoteParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['NoteParams']> = zod.object({
  methodType: zod.literal('noteDetail', { error: 'methodType must be "noteDetail"' }),
  note_id: zod.string({ error: 'note_id must be a string' }),
  xsec_token: zod.string({ error: 'xsec_token must be a string' })
})

/**
 * 小红书评论数据参数验证模式
 */
const CommentParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('noteComments', { error: 'methodType must be "noteComments"' }),
  note_id: zod.string({ error: 'note_id must be a string' }),
  cursor: zod.string({ error: 'cursor must be a string' }).optional(),
  xsec_token: zod.string({ error: 'xsec_token must be a string' })
})

/**
 * 小红书用户数据参数验证模式
 */
const UserParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['UserParams']> = zod.object({
  methodType: zod.literal('userProfile', { error: 'methodType must be "userProfile"' }),
  user_id: zod.string({ error: 'user_id must be a string' })
})

/**
 * 小红书用户笔记数据参数验证模式
 */
const UserNoteParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['UserNoteParams']> = zod.object({
  methodType: zod.literal('userNoteList', { error: 'methodType must be "userNoteList"' }),
  user_id: zod.string({ error: 'user_id must be a string' }),
  cursor: zod.string({ error: 'cursor must be a string' }).optional(),
  num: zod.coerce.number({ error: 'num must be a number' }).int({ error: 'num must be an integer' }).min(1, { error: 'num cannot be less than 1' }).max(100, { error: 'num cannot be greater than 100' }).optional()
})

/**
 * 小红书表情列表参数验证模式
 */
const EmojiListParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['EmojiListParams']> = zod.object({
  methodType: zod.literal('emojiList', { error: 'methodType must be "emojiList"' })
})

/**
 * 小红书搜索笔记参数验证模式
 */
const SearchNoteParamsSchema: zod.ZodType<XiaohongshuMethodOptionsMap['SearchNoteParams']> = zod.object({
  methodType: zod.literal('searchNotes', { error: 'methodType must be "searchNotes"' }),
  keyword: zod.string({ error: 'keyword must be a string' }),
  page: zod.coerce.number({ error: 'page must be a number' }).int({ error: 'page must be an integer' }).min(1, { error: 'page cannot be less than 1' }).optional(),
  page_size: zod.coerce.number({ error: 'page_size must be a number' }).int({ error: 'page_size must be an integer' }).min(1, { error: 'page_size cannot be less than 1' }).max(100, { error: 'page_size cannot be greater than 100' }).optional(),
  sort: zod.enum(SearchSortTypeValues, { error: 'Invalid sort type' }).optional(),
  note_type: zod.coerce.number({ error: 'note_type must be a number' }).int({ error: 'note_type must be an integer' }).refine((val) => SearchNoteTypeValues.includes(val), { message: 'Invalid note type' }).optional()
})

/**
 * 小红书验证模式映射
 */
export const XiaohongshuValidationSchemas = {
  homeFeed: HomeFeedParamsSchema,
  noteDetail: NoteParamsSchema,
  noteComments: CommentParamsSchema,
  userProfile: UserParamsSchema,
  userNoteList: UserNoteParamsSchema,
  emojiList: EmojiListParamsSchema,
  searchNotes: SearchNoteParamsSchema
} as const

/**
 * 小红书方法路由映射
 */
export const XiaohongshuMethodRoutes = {
  homeFeed: '/fetch_home_feed',
  noteDetail: '/fetch_one_note',
  noteComments: '/fetch_note_comments',
  userProfile: '/fetch_user_profile',
  userNoteList: '/fetch_user_notes',
  emojiList: '/fetch_emoji_list',
  searchNotes: '/fetch_search_notes'
} as const

export type XiaohongshuMethodType = keyof typeof XiaohongshuValidationSchemas
