/**
 * Amagi v6 API 规范定义
 *
 * 使用 TypeScript 类型系统定义 RESTful API 规范
 * 所有参数通过查询字符串传递，便于 API 文档编写
 *
 * @module types/api-spec
 */

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * API 端点定义
 */
export interface ApiEndpoint<
  TParams = unknown,
  TResponse = unknown,
  TQuery = unknown,
  TBody = unknown
> {
  /** 端点路径 */
  path: string
  /** HTTP 方法 */
  method: HttpMethod
  /** 端点描述 */
  description: string
  /** 端点标签/分类 */
  tags: string[]
  /** 路径参数 schema */
  params?: TParams
  /** 查询参数 schema */
  query?: TQuery
  /** 请求体 schema */
  body?: TBody
  /** 响应 schema */
  response: TResponse
}

/**
 * 平台类型
 */
export type Platform = 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'

// ============================================================================
// Douyin API 方法映射 (中文 -> 英文 fetcher 方法名)
// ============================================================================

export const DouyinMethodMapping = {
  // 作品相关
  视频作品数据: 'fetchVideoWork',
  图集作品数据: 'fetchImageAlbumWork',
  合辑作品数据: 'fetchSlidesWork',
  文字作品数据: 'fetchTextWork',
  聚合解析: 'parseWork',

  // 评论相关
  评论数据: 'fetchWorkComments',
  指定评论回复数据: 'fetchCommentReplies',

  // 用户相关
  用户主页数据: 'fetchUserProfile',
  用户主页视频列表数据: 'fetchUserVideoList',

  // 搜索相关
  搜索数据: 'searchContent',
  热点词数据: 'fetchSuggestWords',

  // 其他
  音乐数据: 'fetchMusicInfo',
  直播间信息数据: 'fetchLiveRoomInfo',
  申请二维码数据: 'requestLoginQrcode',
  Emoji数据: 'fetchEmojiList',
  动态表情数据: 'fetchDynamicEmojiList',
  弹幕数据: 'fetchDanmakuList'
} as const

/** 英文方法名 -> 中文方法名 反向映射 */
export const DouyinMethodReverseMapping = Object.fromEntries(
  Object.entries(DouyinMethodMapping).map(([k, v]) => [v, k])
) as Record<string, string>

export type DouyinMethodKey = keyof typeof DouyinMethodMapping
export type DouyinMethodValue = typeof DouyinMethodMapping[DouyinMethodKey]

// ============================================================================
// Bilibili API 方法映射 (中文 -> 英文 fetcher 方法名)
// ============================================================================

export const BilibiliMethodMapping = {
  // 视频相关
  单个视频作品数据: 'fetchVideoInfo',
  单个视频下载信息数据: 'fetchVideoStreamUrl',
  实时弹幕: 'fetchVideoDanmaku',

  // 评论相关
  评论数据: 'fetchComments',
  指定评论的回复: 'fetchCommentReplies',

  // 用户相关
  用户主页数据: 'fetchUserCard',
  用户主页动态列表数据: 'fetchUserDynamicList',
  用户空间详细信息: 'fetchUserSpaceInfo',
  获取UP主总播放量: 'fetchUploaderTotalViews',

  // 动态相关
  动态详情数据: 'fetchDynamicDetail',
  动态卡片数据: 'fetchDynamicCard',

  // 番剧相关
  番剧基本信息数据: 'fetchBangumiInfo',
  番剧下载信息数据: 'fetchBangumiStreamUrl',

  // 直播相关
  直播间信息: 'fetchLiveRoomInfo',
  直播间初始化信息: 'fetchLiveRoomInitInfo',

  // 专栏相关
  专栏正文内容: 'fetchArticleContent',
  专栏显示卡片信息: 'fetchArticleCards',
  专栏文章基本信息: 'fetchArticleInfo',
  文集基本信息: 'fetchArticleListInfo',

  // 登录相关
  登录基本信息: 'fetchLoginStatus',
  申请二维码: 'requestLoginQrcode',
  二维码状态: 'checkQrcodeStatus',

  // 工具
  AV转BV: 'convertAvToBv',
  BV转AV: 'convertBvToAv',
  Emoji数据: 'fetchEmojiList',

  // 验证码
  从_v_voucher_申请_captcha: 'requestCaptchaFromVoucher',
  验证验证码结果: 'validateCaptchaResult'
} as const

/** 英文方法名 -> 中文方法名 反向映射 */
export const BilibiliMethodReverseMapping = Object.fromEntries(
  Object.entries(BilibiliMethodMapping).map(([k, v]) => [v, k])
) as Record<string, string>

export type BilibiliMethodKey = keyof typeof BilibiliMethodMapping
export type BilibiliMethodValue = typeof BilibiliMethodMapping[BilibiliMethodKey]

// ============================================================================
// Kuaishou API 方法映射 (中文 -> 英文 fetcher 方法名)
// ============================================================================

export const KuaishouMethodMapping = {
  单个视频作品数据: 'fetchVideoWork',
  评论数据: 'fetchWorkComments',
  Emoji数据: 'fetchEmojiList'
} as const

/** 英文方法名 -> 中文方法名 反向映射 */
export const KuaishouMethodReverseMapping = Object.fromEntries(
  Object.entries(KuaishouMethodMapping).map(([k, v]) => [v, k])
) as Record<string, string>

export type KuaishouMethodKey = keyof typeof KuaishouMethodMapping
export type KuaishouMethodValue = typeof KuaishouMethodMapping[KuaishouMethodKey]

// ============================================================================
// Xiaohongshu API 方法映射 (中文 -> 英文 fetcher 方法名)
// ============================================================================

export const XiaohongshuMethodMapping = {
  首页推荐数据: 'fetchHomeFeed',
  单个笔记数据: 'fetchNoteDetail',
  评论数据: 'fetchNoteComments',
  用户数据: 'fetchUserProfile',
  用户笔记数据: 'fetchUserNoteList',
  表情列表: 'fetchEmojiList',
  搜索笔记: 'searchNotes'
} as const

/** 英文方法名 -> 中文方法名 反向映射 */
export const XiaohongshuMethodReverseMapping = Object.fromEntries(
  Object.entries(XiaohongshuMethodMapping).map(([k, v]) => [v, k])
) as Record<string, string>

export type XiaohongshuMethodKey = keyof typeof XiaohongshuMethodMapping
export type XiaohongshuMethodValue = typeof XiaohongshuMethodMapping[XiaohongshuMethodKey]

// ============================================================================
// HTTP API 路由定义 (RESTful 风格，参数通过查询字符串传递)
// ============================================================================

/**
 * Douyin HTTP API 路由
 *
 * 所有参数通过查询字符串传递，例如:
 * GET /api/douyin/work?aweme_id=xxx
 * GET /api/douyin/comments?aweme_id=xxx&number=50
 */
export const DouyinApiRoutes = {
  // 作品相关
  parseWork: '/work',
  videoWork: '/work',
  imageAlbumWork: '/work',
  slidesWork: '/work',
  textWork: '/work',

  // 评论相关
  comments: '/comments',
  commentReplies: '/comment-replies',

  // 用户相关
  userProfile: '/user',
  userVideoList: '/user/videos',

  // 搜索相关
  search: '/search',
  suggestWords: '/search/suggest',

  // 音乐相关
  musicInfo: '/music',

  // 直播相关
  liveRoomInfo: '/live',

  // 认证相关
  loginQrcode: '/auth/qrcode',

  // 表情相关
  emojiList: '/emoji',
  dynamicEmojiList: '/emoji/dynamic',

  // 弹幕相关
  danmakuList: '/danmaku'
} as const

/**
 * Bilibili HTTP API 路由
 *
 * 所有参数通过查询字符串传递，例如:
 * GET /api/bilibili/video?bvid=xxx
 * GET /api/bilibili/comments?oid=xxx&type=1
 */
export const BilibiliApiRoutes = {
  // 视频相关
  videoInfo: '/video',
  videoStream: '/video/stream',
  videoDanmaku: '/video/danmaku',

  // 评论相关
  comments: '/comments',
  commentReplies: '/comment-replies',

  // 用户相关
  userCard: '/user',
  userDynamicList: '/user/dynamics',
  userSpaceInfo: '/user/space',
  uploaderTotalViews: '/user/total-views',

  // 动态相关
  dynamicDetail: '/dynamic',
  dynamicCard: '/dynamic/card',

  // 番剧相关
  bangumiInfo: '/bangumi',
  bangumiStream: '/bangumi/stream',

  // 直播相关
  liveRoomInfo: '/live',
  liveRoomInit: '/live/init',

  // 专栏相关
  articleContent: '/article/content',
  articleCards: '/article/cards',
  articleInfo: '/article',
  articleListInfo: '/article-list',

  // 认证相关
  loginStatus: '/auth/status',
  loginQrcode: '/auth/qrcode',
  qrcodeStatus: '/auth/qrcode/status',

  // 工具相关
  avToBv: '/convert/av-to-bv',
  bvToAv: '/convert/bv-to-av',

  // 表情相关
  emojiList: '/emoji',

  // 验证码相关
  captchaFromVoucher: '/captcha',
  validateCaptcha: '/captcha/validate'
} as const

/**
 * Kuaishou HTTP API 路由
 */
export const KuaishouApiRoutes = {
  videoWork: '/work',
  comments: '/comments',
  emojiList: '/emoji'
} as const

/**
 * Xiaohongshu HTTP API 路由
 */
export const XiaohongshuApiRoutes = {
  homeFeed: '/feed',
  noteDetail: '/note',
  noteComments: '/comments',
  userProfile: '/user',
  userNoteList: '/user/notes',
  emojiList: '/emoji',
  searchNotes: '/search'
} as const

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 根据中文方法名获取英文 fetcher 方法名
 */
export function getEnglishMethodName<T extends Platform> (
  platform: T,
  chineseMethod: string
): string | undefined {
  const mappings = {
    douyin: DouyinMethodMapping,
    bilibili: BilibiliMethodMapping,
    kuaishou: KuaishouMethodMapping,
    xiaohongshu: XiaohongshuMethodMapping
  }

  return (mappings[platform] as Record<string, string>)[chineseMethod]
}

/**
 * 根据英文 fetcher 方法名获取中文方法名
 */
export function getChineseMethodName<T extends Platform> (
  platform: T,
  englishMethod: string
): string | undefined {
  const mappings = {
    douyin: DouyinMethodReverseMapping,
    bilibili: BilibiliMethodReverseMapping,
    kuaishou: KuaishouMethodReverseMapping,
    xiaohongshu: XiaohongshuMethodReverseMapping
  }

  return mappings[platform][englishMethod]
}

/**
 * 根据 methodType 获取 HTTP API 路由路径
 */
export function getApiRoute<T extends Platform> (
  platform: T,
  methodType: string
): string | undefined {
  const routes = {
    douyin: DouyinApiRoutes,
    bilibili: BilibiliApiRoutes,
    kuaishou: KuaishouApiRoutes,
    xiaohongshu: XiaohongshuApiRoutes
  }

  return (routes[platform] as Record<string, string>)[methodType]
}

/**
 * 检查是否为英文 fetcher 方法名
 */
export function isEnglishMethodName<T extends Platform> (
  platform: T,
  method: string
): boolean {
  const mappings = {
    douyin: DouyinMethodReverseMapping,
    bilibili: BilibiliMethodReverseMapping,
    kuaishou: KuaishouMethodReverseMapping,
    xiaohongshu: XiaohongshuMethodReverseMapping
  }

  return method in mappings[platform]
}

/**
 * 检查是否为中文方法名
 */
export function isChineseMethodName<T extends Platform> (
  platform: T,
  method: string
): boolean {
  const mappings = {
    douyin: DouyinMethodMapping,
    bilibili: BilibiliMethodMapping,
    kuaishou: KuaishouMethodMapping,
    xiaohongshu: XiaohongshuMethodMapping
  }

  return method in (mappings[platform] as Record<string, string>)
}
