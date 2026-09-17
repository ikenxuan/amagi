/**
 * 小红书 URL 构造（纯函数）。
 *
 * 纯函数 URL 构造，保持 `{ Url, Body, apiPath }` 三段。
 *
 * `searchNotes` 的 `search_id` 由调用方显式传入（由 `sign/` 的 `getSearchId()`
 * 生成），本模块因此无随机性、可复现。
 */

/** 搜索排序类型 */
export const SEARCH_SORT_TYPE = {
  GENERAL: 'general',
  MOST_POPULAR: 'popularity_descending',
  LATEST: 'time_descending'
} as const

/** 搜索笔记类型 */
export const SEARCH_NOTE_TYPE = {
  ALL: 0,
  VIDEO: 1,
  IMAGE: 2
} as const

/** 请求描述：`Url` / `Body` / `apiPath` 三段（GET 端点没有 `Body`） */
export interface XhsRequestDescription {
  /** 完整请求 URL（GET 端点含 query） */
  Url: string
  /** POST 请求体；GET 端点缺省 */
  Body?: unknown
  /** 供签名用的接口路径，与 `Url` 的 pathname 一致 */
  apiPath: string
}

/** `homeFeed` 参数 */
export interface HomeFeedParams {
  /** 分页游标分数 */
  cursor_score?: string
  /** 每次请求的数量 */
  num?: number
  /** 刷新类型 */
  refresh_type?: number
  /** 笔记索引 */
  note_index?: number
  /** 分类 */
  category?: string
  /** 搜索关键词 */
  search_key?: string
}

/** `noteDetail` 参数 */
export interface NoteDetailParams {
  /** 笔记 ID */
  note_id: string
  /** 反爬 token，可从网页地址中获取 */
  xsec_token: string
}

/** `noteComments` 参数 */
export interface NoteCommentsParams {
  /** 笔记 ID */
  note_id: string
  /** 分页游标 */
  cursor?: string
  /** 反爬 token，可从网页地址中获取 */
  xsec_token: string
}

/** `userProfile` 参数 */
export interface UserProfileParams {
  /** 用户 ID */
  user_id: string
}

/** `userNoteList` 参数 */
export interface UserNoteListParams {
  /** 用户 ID */
  user_id: string
  /** 上一页最后一条笔记的 ID */
  cursor?: string
  /** 每次请求的数量，默认 30 */
  num?: number
}

/** `searchNotes` 参数 */
export interface SearchNotesParams {
  /** 搜索关键词 */
  keyword: string
  /** 页码，默认 1 */
  page?: number
  /** 每页数量，默认 20 */
  page_size?: number
}

/** 构建查询字符串：跳过 null / undefined，其余 URL 编码 */
const buildQueryString = (params: Record<string, string | number>): string =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')

/** 首页推荐（POST） */
export const homeFeed = (data: HomeFeedParams = {}): XhsRequestDescription => ({
  apiPath: '/api/sns/web/v1/homefeed',
  Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/homefeed',
  Body: {
    cursor_score: data.cursor_score ?? '1.7599348899670024E9',
    num: data.num ?? 33,
    refresh_type: data.refresh_type ?? 3,
    note_index: data.note_index ?? 33,
    category: data.category ?? 'homefeed_recommend',
    search_key: data.search_key ?? '',
    image_formats: ['jpg', 'webp', 'avif']
  }
})

/** 笔记详情（POST） */
export const noteDetail = (data: NoteDetailParams): XhsRequestDescription => ({
  apiPath: '/api/sns/web/v1/feed',
  Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/feed',
  Body: {
    source_note_id: data.note_id,
    image_formats: ['jpg', 'webp', 'avif'],
    extra: { need_body_topic: '1' },
    xsec_source: 'pc_feed',
    xsec_token: data.xsec_token
  }
})

/** 笔记评论（GET，参数进 query） */
export const noteComments = (data: NoteCommentsParams): XhsRequestDescription => {
  const params: Record<string, string> = {
    note_id: data.note_id,
    cursor: data.cursor ?? '',
    image_formats: ['jpg', 'webp', 'avif'].join(','),
    xsec_token: data.xsec_token
  }
  return {
    apiPath: '/api/sns/web/v2/comment/page',
    Url: `https://edith.xiaohongshu.com/api/sns/web/v2/comment/page?${buildQueryString(params)}`
  }
}

/** 用户信息（GET，请求的是 HTML 页，由 judge / decode 层处理） */
export const userProfile = (data: UserProfileParams): XhsRequestDescription => ({
  apiPath: '/api/sns/web/v1/user/otherinfo',
  Url: `https://www.xiaohongshu.com/user/profile/${data.user_id}`
})

/** 用户笔记列表（GET，参数进 query） */
export const userNoteList = (data: UserNoteListParams): XhsRequestDescription => {
  const params: Record<string, string | number> = {
    user_id: data.user_id,
    cursor: data.cursor ?? '',
    num: data.num ?? 30,
    image_formats: ['jpg', 'webp', 'avif'].join(','),
    xsec_source: 'pc_feed'
  }
  return {
    apiPath: '/api/sns/web/v1/user_posted',
    Url: `https://edith.xiaohongshu.com/api/sns/web/v1/user_posted?${buildQueryString(params)}`
  }
}

/** 表情列表（GET，无参数） */
export const emojiList = (): XhsRequestDescription => ({
  apiPath: '/api/im/redmoji/detail',
  Url: 'https://edith.xiaohongshu.com/api/im/redmoji/detail'
})

/**
 * 搜索笔记（POST）。
 * @param data - 参数
 * @param searchId - 本次搜索的 search_id，由 `sign/` 的 `getSearchId()` 生成
 *   （显式传入以保持本模块纯函数）
 */
export const searchNotes = (data: SearchNotesParams, searchId: string): XhsRequestDescription => ({
  apiPath: '/api/sns/web/v1/search/notes',
  Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/search/notes',
  Body: {
    keyword: data.keyword,
    page: data.page ?? 1,
    page_size: data.page_size ?? 20,
    sort: SEARCH_SORT_TYPE.GENERAL,
    note_type: SEARCH_NOTE_TYPE.ALL,
    search_id: searchId,
    image_formats: ['jpg', 'webp', 'avif']
  }
})

/**
 * 七个请求描述构造器的集合，公开面用（`client.xiaohongshu.apiUrls`）。
 *
 * **返回形态与抖音 / B站 不同**：那两家给的是 URL 字符串，这里给
 * `XhsRequestDescription`（`Url` / `Body` / `apiPath` 三段）。原因是小红书的
 * `x-s` 签名只吃 pathname、POST 的 body 又要参与签名，一个字符串装不下这三样。
 *
 * 快手那份（`kuaishouApiUrls`）也是描述对象（`KuaishouH5Request` /
 * `KuaishouGraphqlRequest`，带 `method` / `body` / `signPath` / `referer`），
 * 所以是**两家字符串、两家描述对象**。用法：
 *
 * ```ts
 * const d = client.xiaohongshu.apiUrls.noteDetail({ note_id, xsec_token })
 * const r = await client.xiaohongshu.request.request({
 *   method: 'POST', url: d.Url, data: d.Body, amagi: { signPath: d.apiPath }
 * })
 * ```
 */
export const xiaohongshuApiUrls = {
  homeFeed,
  noteDetail,
  noteComments,
  userProfile,
  userNoteList,
  emojiList,
  searchNotes
}
