import type { ParsedOf } from '../../contracts/endpoint'
import type { homeFeed as homeFeedEndpoint } from './endpoints/homeFeed'
import type { noteComments as noteCommentsEndpoint } from './endpoints/noteComments'
import type { noteDetail as noteDetailEndpoint } from './endpoints/noteDetail'
import type { searchNotes as searchNotesEndpoint } from './endpoints/searchNotes'
import type { userNoteList as userNoteListEndpoint } from './endpoints/userNoteList'
import type { userProfile as userProfileEndpoint } from './endpoints/userProfile'
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
  /**
   * GET 端点的查询参数（原始对象）。**必须参与 x-s 签名**：小红书对 GET 请求
   * 的签名覆盖「路径 + query」，只签路径会被判非法请求返回 HTTP 406。
   * 签名器据此调用 `signXsGet(apiPath, a1, appid, signParams)`。
   * 与 `Url` 里的 query 用同一套编码（见 `buildQueryString`），两者必须逐字节一致。
   */
  signParams?: Record<string, string | number>
}

/** `homeFeed` 参数 */
export interface HomeFeedParams extends ParsedOf<typeof homeFeedEndpoint> {}

/** `noteDetail` 参数 */
export interface NoteDetailParams extends ParsedOf<typeof noteDetailEndpoint> {}

/** `noteComments` 参数 */
export interface NoteCommentsParams extends ParsedOf<typeof noteCommentsEndpoint> {}

/** `subComments`（楼中楼 / 子评论）参数 */
export interface SubCommentsParams {
  /** 笔记 ID */
  note_id: string
  /** 要展开的父评论（一级评论）ID */
  root_comment_id: string
  /** 分页游标 */
  cursor?: string
  /** 单页数量，真机默认 10 */
  num?: number
  /** 反爬 token，可从网页地址中获取 */
  xsec_token: string
}

/** `userProfile` 参数 */
export interface UserProfileParams extends ParsedOf<typeof userProfileEndpoint> {}

/** `userNoteList` 参数 */
export interface UserNoteListParams extends ParsedOf<typeof userNoteListEndpoint> {}

/** `searchUser` 参数 */
export interface SearchUserParams {
  /** 搜索关键词（可传昵称或小红书号，用于查用户 user_id，如订阅直播前置查询） */
  keyword: string
  /** 页码，默认 1 */
  page?: number
  /** 每页数量，默认 15 */
  page_size?: number
}

/** `searchNotes` 参数 */
export interface SearchNotesParams extends ParsedOf<typeof searchNotesEndpoint> {}

/**
 * 构建查询字符串：跳过 null / undefined。
 *
 * **编码规则必须与 `@ikenxuan/xhshow-ts` 的签名内部编码完全一致**：只把值里的
 * `=` 转成 `%3D`，其余字符（含 `,`）原样保留。小红书对 GET 请求按「路径 + 这套
 * 编码的 query」计算 x-s，若这里用 `encodeURIComponent`（会把 `,` 转成 `%2C`），
 * 发出去的 query 与被签名的内容不一致，平台返回 HTTP 406。
 */
const buildQueryString = (params: Record<string, string | number>): string =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${String(value).replace(/=/g, '%3D')}`)
    .join('&')

/** 直播相关接口的域名（移植自 v6）。 */
const LIVE_ROOM_BASE = 'https://live-room.xiaohongshu.com'

/** `liveRoom` 参数 */
export interface LiveRoomParams {
  /** 直播间 ID */
  room_id: string
  /** 端类型：'h5' 走 h5 接口，其余走 web 接口，默认 web */
  variant?: 'h5' | 'web'
  /**
   * 请求方（当前登录用户）ID —— web 端真机必带（CDP 实测 2026-09-20），
   * 缺失会导致 406 / code:-1。可从 cookie 的 userId 或 me 接口取。
   */
  request_user_id?: string
  /** 来源标识，默认按端类型取（h5=share_out_of_app，web=web_live） */
  source?: string
  /** 客户端类型，web 端真机固定 1 */
  client_type?: number
}

/** `liveStatus` 参数 */
export interface LiveStatusParams {
  /** 直播间 ID */
  room_id: string
  /** 场景标识，默认 share_out_of_app */
  scene?: string
}

/** `liveSquare` 参数 */
export interface LiveSquareParams {
  /** 来源标识，默认 13 */
  source?: number
  /** 分类，默认 '0'（全部）；直播广场分类 tab 的 id */
  category?: string
  /** 前置来源，真机首屏为空字符串 */
  pre_source?: string
  /** 每页数量，默认 27 */
  size?: number
  /**
   * 图片格式等附加信息，真机首屏出站为 `{"image_formats":["jpg","webp","avif"]}`（CDP 实测 2026-09-20）。
   * 传对象自动 JSON 序列化；缺省即用真机默认值。
   */
  extra_info?: Record<string, unknown>
  /** 分页游标分数（翻页时才带，首屏真机不发） */
  cursor_score?: string
}

/**
 * 首页推荐（POST）
 *
 * 2026-10-07 Edge 154 登录态：explore 首屏走 SSR（`__INITIAL_STATE__.feed.feeds` 35 条），
 * 不发 homefeed，所以浏览器里没有 `note_index=0` 的首请求可对照。之后的 XHR
 * （滚动 / 点频道刷新）`num` / `need_num` 随视口变：1280×720 是 30/10，默认窗口 39/14，
 * 2560×1440 是 47/22；首个 XHR 的 `note_index` 等于 SSR 条数 35，之后在 30–38 间变动；
 * 6 次实测 `cursor_score` 都为空。默认值不按某一档视口去改。
 */
export const homeFeed = (data: HomeFeedParams = {}): XhsRequestDescription => ({
  apiPath: '/api/sns/web/v1/homefeed',
  Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/homefeed',
  Body: {
    cursor_score: data.cursor_score ?? '',
    num: data.num ?? 27,
    refresh_type: data.refresh_type ?? 1,
    note_index: data.note_index ?? 0,
    unread_begin_note_id: data.unread_begin_note_id ?? '',
    unread_end_note_id: data.unread_end_note_id ?? '',
    unread_note_count: data.unread_note_count ?? 0,
    category: data.category ?? 'homefeed_recommend',
    search_key: data.search_key ?? '',
    need_num: data.need_num ?? 8,
    image_formats: ['jpg', 'webp', 'avif'],
    need_filter_image: data.need_filter_image ?? false
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
    top_comment_id: '',
    image_formats: ['jpg', 'webp', 'avif'].join(','),
    xsec_token: data.xsec_token
  }
  return {
    apiPath: '/api/sns/web/v2/comment/page',
    Url: `https://edith.xiaohongshu.com/api/sns/web/v2/comment/page?${buildQueryString(params)}`,
    signParams: params
  }
}

/**
 * 子评论（楼中楼）分页。
 *
 * 真机 CDP 实测（2026-09-20，点「展开 N 条回复」触发）出站 query：
 * `note_id / root_comment_id / num=10 / cursor / image_formats=jpg,webp,avif / top_comment_id=(空) / xsec_token`
 * 相较主评论（comment/page）多 `root_comment_id`（要展开的一级评论 ID）。
 * 签名档同主评论 `xhs-get-trace`（GET，XYS_ + trace，不带 rap —— 与真机 comment 头一致）。
 */
export const subComments = (data: SubCommentsParams): XhsRequestDescription => {
  const params: Record<string, string> = {
    note_id: data.note_id,
    root_comment_id: data.root_comment_id,
    num: String(data.num ?? 10),
    cursor: data.cursor ?? '',
    image_formats: ['jpg', 'webp', 'avif'].join(','),
    top_comment_id: '',
    xsec_token: data.xsec_token
  }
  return {
    apiPath: '/api/sns/web/v2/comment/sub/page',
    Url: `https://edith.xiaohongshu.com/api/sns/web/v2/comment/sub/page?${buildQueryString(params)}`,
    signParams: params
  }
}

/**
 * 用户信息（GET，走 API）。
 *
 * 改为请求 `edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo`（参照
 * cvcat/Spider_XHS 实抓），返回稳定 JSON。参数名为 `target_user_id`。
 *
 * 早前版本抓 `www.xiaohongshu.com/user/profile/{id}` 的 HTML 再解析
 * `__INITIAL_STATE__`，但前端已把该值改成 Vue 3 ref 包装对象、结构随版本漂移，
 * 抓取脆弱易碎；API 路线稳定，且与其余端点一致（全部走 JSON）。
 *
 * 2026-10-04 真机对照（Edge 154 登录态，站内跳转到他人主页，200）：出站 query 是
 * `target_user_id / xsec_token / xsec_source=pc_feed`，顺序如此。xsec_token 随
 * 用户主页链接下发，拿不到时只发 target_user_id —— 与线上不一致，平台可能拦。
 */
export const userProfile = (data: UserProfileParams): XhsRequestDescription => {
  // 字段顺序对齐真机（target_user_id,xsec_token,xsec_source）；没有 token 时不补空值
  const params: Record<string, string> = { target_user_id: data.user_id }
  if (data.xsec_token !== undefined && data.xsec_token !== '') {
    params.xsec_token = data.xsec_token
    params.xsec_source = data.xsec_source ?? 'pc_feed'
  }
  return {
    apiPath: '/api/sns/web/v1/user/otherinfo',
    Url: `https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?${buildQueryString(params)}`,
    signParams: params
  }
}

/** 用户笔记列表（GET，参数进 query） */
export const userNoteList = (data: UserNoteListParams): XhsRequestDescription => {
  // 字段顺序对齐真机（num,cursor,user_id,image_formats,xsec_token,xsec_source）。
  const params: Record<string, string | number> = {
    num: data.num ?? 30,
    cursor: data.cursor ?? '',
    user_id: data.user_id,
    image_formats: ['jpg', 'webp', 'avif'].join(','),
    xsec_token: data.xsec_token,
    xsec_source: data.xsec_source ?? 'pc_feed'
  }
  return {
    apiPath: '/api/sns/web/v1/user_posted',
    Url: `https://edith.xiaohongshu.com/api/sns/web/v1/user_posted?${buildQueryString(params)}`,
    signParams: params
  }
}

/** 表情列表（GET，无参数） */
export const emojiList = (): XhsRequestDescription => ({
  apiPath: '/api/im/redmoji/detail',
  Url: 'https://edith.xiaohongshu.com/api/im/redmoji/detail'
})

/**
 * 搜索笔记（POST）。
 *
 * **域名与版本**：走 `so.xiaohongshu.com` 的 `/api/sns/web/v2/search/notes`
 * （真机 CDP Fetch 层实测：PC web 端搜索的实际出站域名/版本，前端已全量切 v2，
 * `edith/v1` 已弃用；so 与 www 同站，cookie 由 header 显式带，不受跨子域影响）。
 * 签名格式仍是 XYS_（`xhs-post-rap`）——真机出站头验证过，搜索不走 XYW_。
 *
 * @param data - 参数
 * @param searchId - 本次搜索的 search_id，由 `sign/` 的 `getSearchId()` 生成
 * @param sessionId - 搜索会话 id（UUIDv4），翻页复用同一值
 * @param searchRequestId - 单次请求 id `{random}-{ts_ms}`，由 `getSearchRequestId()` 生成
 *   （三个随机源均显式传入以保持本模块纯函数）
 */
export const searchNotes = (
  data: SearchNotesParams,
  searchId: string,
  sessionId: string = '',
  searchRequestId: string = ''
): XhsRequestDescription => ({
  apiPath: '/api/sns/web/v2/search/notes',
  Url: 'https://so.xiaohongshu.com/api/sns/web/v2/search/notes',
  Body: {
    keyword: data.keyword,
    page: data.page ?? 1,
    page_size: data.page_size ?? 20,
    search_id: searchId,
    session_id: sessionId,
    search_request_id: searchRequestId,
    sort: data.sort ?? SEARCH_SORT_TYPE.GENERAL,
    note_type: data.note_type ?? SEARCH_NOTE_TYPE.ALL,
    ext_flags: [],
    geo: '',
    image_formats: ['jpg', 'webp', 'avif']
  }
})

/**
 * 搜索用户（POST）。参照 cvcat/Spider_XHS 实抓：
 * `edith.xiaohongshu.com/api/sns/web/v1/search/usersearch`。
 *
 * 用于按关键词/小红书号查用户 `user_id`（如「订阅用户直播」前置：先查到
 * user_id，再用 `liveRoom`/`liveStatus` 查直播间）。签名档 `xhs-post`（纯 XYS_）。
 *
 * body 结构是**嵌套的** `search_user_request` 对象（与 searchNotes 的扁平 body 不同）。
 *
 * @param data - 参数
 * @param searchId - `getSearchId()` 生成
 * @param requestId - `getSearchRequestId()` 生成
 */
export const searchUser = (data: SearchUserParams, searchId: string, requestId: string): XhsRequestDescription => ({
  apiPath: '/api/sns/web/v1/search/usersearch',
  Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/search/usersearch',
  Body: {
    search_user_request: {
      keyword: data.keyword,
      search_id: searchId,
      page: data.page ?? 1,
      page_size: data.page_size ?? 15,
      biz_type: 'web_search_user',
      request_id: requestId
    }
  }
})

/**
 * 搜索热榜（GET，无参数）。
 *
 * 移植自 v6：`edith.xiaohongshu.com/api/sns/mobile/v1/search/hot_list_h5`，
 * 返回当前搜索热榜条目。无请求参数，`x-s` 只对 pathname 签名。
 */
export const searchHotList = (): XhsRequestDescription => ({
  apiPath: '/api/sns/mobile/v1/search/hot_list_h5',
  Url: 'https://edith.xiaohongshu.com/api/sns/mobile/v1/search/hot_list_h5'
})

/**
 * 直播间信息（GET）。移植自 v6：`live-room.xiaohongshu.com`。
 * `variant: 'h5'` 走 h5 接口，否则走 web 接口，两者 source 默认值不同。
 */
export const liveRoom = (data: LiveRoomParams): XhsRequestDescription => {
  const useH5 = data.variant === 'h5'
  const apiPath = useH5 ? '/api/sns/red/live/h5/v1/room/current_room_info' : '/api/sns/red/live/web/v1/room/current_room_info'
  // web 端真机出站参数（CDP 实测 2026-09-20）：
  // room_id / request_user_id / source=web_live / client_type=1
  const params: Record<string, string | number> = {
    room_id: data.room_id,
    source: data.source ?? (useH5 ? 'share_out_of_app' : 'web_live')
  }
  if (!useH5) {
    if (data.request_user_id) params.request_user_id = data.request_user_id
    params.client_type = data.client_type ?? 1
  }
  return { apiPath, Url: `${LIVE_ROOM_BASE}${apiPath}?${buildQueryString(params)}`, signParams: params }
}

/**
 * 直播状态（GET，h5）。移植自 v6：返回体极小（三字段），适合高频判活。
 */
export const liveStatus = (data: LiveStatusParams): XhsRequestDescription => {
  const apiPath = '/api/sns/red/live/h5/v1/core/current_live_status'
  const params = {
    room_id: data.room_id,
    scene: data.scene ?? 'share_out_of_app'
  }
  return { apiPath, Url: `${LIVE_ROOM_BASE}${apiPath}?${buildQueryString(params)}`, signParams: params }
}

/**
 * 直播广场 feed（GET）。移植自 v6：无必填参数。
 */
export const liveSquare = (data: LiveSquareParams = {}): XhsRequestDescription => {
  const apiPath = '/api/sns/red/live/web/feed/v1/squarefeed'
  // 真机首屏出站参数（CDP 实测 + cvcat 对齐 2026-09-20）：
  // source=13 / category=0 / pre_source（空）/ extra_info / size=27，不带 cursor_score。
  // extra_info 是 JSON，含 `{}[]"` 等非法 query 字符，必须 URL 编码（cvcat 用 quote(safe=":,")，
  // 即保留 `:` 和 `,` 可读）。签名侧与 URL 侧共用**编码后**的同一份值，两者逐字节一致才不 406/-1。
  const extraInfo = encodeURIComponent(JSON.stringify(data.extra_info ?? { image_formats: ['jpg', 'webp', 'avif'] }))
    .replace(/%3A/g, ':')
    .replace(/%2C/g, ',')
  const params: Record<string, string | number> = {
    source: data.source ?? 13,
    category: data.category ?? '0',
    pre_source: data.pre_source ?? '',
    extra_info: extraInfo,
    size: data.size ?? 27
  }
  if (data.cursor_score) params.cursor_score = data.cursor_score
  return { apiPath, Url: `${LIVE_ROOM_BASE}${apiPath}?${buildQueryString(params)}`, signParams: params }
}

/**
 * 请求描述构造器的集合，公开面用（`client.xiaohongshu.apiUrls`）。
 *
 * **返回形态逐平台不同**：抖音给的全是 URL 字符串；B站也以字符串为主（26 个构造器里
 * 24 个），例外是 `getCaptchaFromVoucher` / `validateCaptcha` 这两个验证码接口 ——
 * 它们返回 `{ Url, Body }`。这里给 `XhsRequestDescription`
 * （`Url` / `Body` / `apiPath` 三段）。原因是小红书的 `x-s` 签名只吃 pathname、
 * POST 的 body 又要参与签名，一个字符串装不下这三样。
 *
 * 快手那份（`kuaishouApiUrls`）也返回描述对象，共三种：`KuaishouH5Request`（只有它
 * 带 `referer`）/ `KuaishouLiveApiRequest` / `KuaishouGraphqlRequest`。用法：
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
  subComments,
  userProfile,
  userNoteList,
  emojiList,
  searchNotes,
  searchUser,
  searchHotList,
  liveRoom,
  liveStatus,
  liveSquare
}
