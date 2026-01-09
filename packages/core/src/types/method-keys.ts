/**
 * API 方法名常量定义
 *
 * 设计说明：
 * - 底层 getdata.ts 和 API.ts 仍使用中文 key (内部实现)
 * - Fetcher 层使用英文方法名 (对外 API)
 * - 此文件提供中英文映射，用于日志、事件等场景
 */

// ============================================================================
// B站方法名映射
// ============================================================================

/** B站内部方法名 (中文，用于 getdata.ts) */
export const BilibiliInternalMethods = {
  VIDEO_INFO: '单个视频作品数据',
  VIDEO_STREAM: '单个视频下载信息数据',
  VIDEO_DANMAKU: '实时弹幕',
  COMMENTS: '评论数据',
  COMMENT_REPLIES: '指定评论的回复',
  USER_CARD: '用户主页数据',
  USER_DYNAMICS: '用户主页动态列表数据',
  USER_SPACE_INFO: '用户空间详细信息',
  USER_TOTAL_VIEWS: '获取UP主总播放量',
  DYNAMIC_DETAIL: '动态详情数据',
  DYNAMIC_CARD: '动态卡片数据',
  BANGUMI_INFO: '番剧基本信息数据',
  BANGUMI_STREAM: '番剧下载信息数据',
  LIVE_ROOM_INFO: '直播间信息',
  LIVE_ROOM_INIT: '直播间初始化信息',
  ARTICLE_CONTENT: '专栏正文内容',
  ARTICLE_CARDS: '专栏显示卡片信息',
  ARTICLE_INFO: '专栏文章基本信息',
  ARTICLE_LIST_INFO: '文集基本信息',
  LOGIN_STATUS: '登录基本信息',
  LOGIN_QRCODE: '申请二维码',
  QRCODE_STATUS: '二维码状态',
  APPLY_CAPTCHA: '从_v_voucher_申请_captcha',
  VALIDATE_CAPTCHA: '验证验证码结果',
  AV_TO_BV: 'AV转BV',
  BV_TO_AV: 'BV转AV',
  EMOJI_LIST: 'Emoji数据'
} as const

/** B站 Fetcher 方法名 (英文，对外 API) */
export const BilibiliFetcherMethods = {
  VIDEO_INFO: 'fetchVideoInfo',
  VIDEO_STREAM: 'fetchVideoStreamUrl',
  VIDEO_DANMAKU: 'fetchVideoDanmaku',
  COMMENTS: 'fetchComments',
  COMMENT_REPLIES: 'fetchCommentReplies',
  USER_CARD: 'fetchUserCard',
  USER_DYNAMICS: 'fetchUserDynamicList',
  USER_SPACE_INFO: 'fetchUserSpaceInfo',
  USER_TOTAL_VIEWS: 'fetchUploaderTotalViews',
  DYNAMIC_DETAIL: 'fetchDynamicDetail',
  DYNAMIC_CARD: 'fetchDynamicCard',
  BANGUMI_INFO: 'fetchBangumiInfo',
  BANGUMI_STREAM: 'fetchBangumiStreamUrl',
  LIVE_ROOM_INFO: 'fetchLiveRoomInfo',
  LIVE_ROOM_INIT: 'fetchLiveRoomInitInfo',
  ARTICLE_CONTENT: 'fetchArticleContent',
  ARTICLE_CARDS: 'fetchArticleCards',
  ARTICLE_INFO: 'fetchArticleInfo',
  ARTICLE_LIST_INFO: 'fetchArticleListInfo',
  LOGIN_STATUS: 'fetchLoginStatus',
  LOGIN_QRCODE: 'requestLoginQrcode',
  QRCODE_STATUS: 'checkQrcodeStatus',
  APPLY_CAPTCHA: 'requestCaptchaFromVoucher',
  VALIDATE_CAPTCHA: 'validateCaptchaResult',
  AV_TO_BV: 'convertAvToBv',
  BV_TO_AV: 'convertBvToAv',
  EMOJI_LIST: 'fetchEmojiList'
} as const

// ============================================================================
// 抖音方法名映射
// ============================================================================

/** 抖音内部方法名 (中文，用于 getdata.ts) */
export const DouyinInternalMethods = {
  VIDEO_WORK: '视频作品数据',
  IMAGE_ALBUM_WORK: '图集作品数据',
  SLIDES_WORK: '合辑作品数据',
  TEXT_WORK: '文字作品数据',
  PARSE_WORK: '聚合解析',
  DANMAKU: '弹幕数据',
  WORK_COMMENTS: '评论数据',
  COMMENT_REPLIES: '指定评论回复数据',
  USER_PROFILE: '用户主页数据',
  USER_VIDEO_LIST: '用户主页视频列表数据',
  SEARCH: '搜索数据',
  SUGGEST_WORDS: '热点词数据',
  MUSIC_INFO: '音乐数据',
  LIVE_ROOM_INFO: '直播间信息数据',
  LOGIN_QRCODE: '申请二维码数据',
  EMOJI_LIST: 'Emoji数据',
  DYNAMIC_EMOJI_LIST: '动态表情数据'
} as const

/** 抖音 Fetcher 方法名 (英文，对外 API) */
export const DouyinFetcherMethods = {
  VIDEO_WORK: 'fetchVideoWork',
  IMAGE_ALBUM_WORK: 'fetchImageAlbumWork',
  SLIDES_WORK: 'fetchSlidesWork',
  TEXT_WORK: 'fetchTextWork',
  PARSE_WORK: 'parseWork',
  DANMAKU: 'fetchDanmakuList',
  WORK_COMMENTS: 'fetchWorkComments',
  COMMENT_REPLIES: 'fetchCommentReplies',
  USER_PROFILE: 'fetchUserProfile',
  USER_VIDEO_LIST: 'fetchUserVideoList',
  SEARCH: 'searchContent',
  SUGGEST_WORDS: 'fetchSuggestWords',
  MUSIC_INFO: 'fetchMusicInfo',
  LIVE_ROOM_INFO: 'fetchLiveRoomInfo',
  LOGIN_QRCODE: 'requestLoginQrcode',
  EMOJI_LIST: 'fetchEmojiList',
  DYNAMIC_EMOJI_LIST: 'fetchDynamicEmojiList'
} as const

// ============================================================================
// 快手方法名映射
// ============================================================================

/** 快手内部方法名 (中文，用于 getdata.ts) */
export const KuaishouInternalMethods = {
  VIDEO_WORK: '单个视频作品数据',
  WORK_COMMENTS: '评论数据',
  EMOJI_LIST: 'Emoji数据'
} as const

/** 快手 Fetcher 方法名 (英文，对外 API) */
export const KuaishouFetcherMethods = {
  VIDEO_WORK: 'fetchVideoWork',
  WORK_COMMENTS: 'fetchWorkComments',
  EMOJI_LIST: 'fetchEmojiList'
} as const

// ============================================================================
// 小红书方法名映射
// ============================================================================

/** 小红书内部方法名 (中文，用于 getdata.ts) */
export const XiaohongshuInternalMethods = {
  HOME_FEED: '首页推荐数据',
  NOTE_DETAIL: '单个笔记数据',
  NOTE_COMMENTS: '评论数据',
  USER_PROFILE: '用户数据',
  USER_NOTES: '用户笔记数据',
  SEARCH_NOTES: '搜索笔记',
  EMOJI_LIST: '表情列表'
} as const

/** 小红书 Fetcher 方法名 (英文，对外 API) */
export const XiaohongshuFetcherMethods = {
  HOME_FEED: 'fetchHomeFeed',
  NOTE_DETAIL: 'fetchNoteDetail',
  NOTE_COMMENTS: 'fetchNoteComments',
  USER_PROFILE: 'fetchUserProfile',
  USER_NOTES: 'fetchUserNoteList',
  SEARCH_NOTES: 'searchNotes',
  EMOJI_LIST: 'fetchEmojiList'
} as const

// ============================================================================
// 类型定义
// ============================================================================

export type BilibiliInternalMethodKey = typeof BilibiliInternalMethods[keyof typeof BilibiliInternalMethods]
export type BilibiliFetcherMethodKey = typeof BilibiliFetcherMethods[keyof typeof BilibiliFetcherMethods]

export type DouyinInternalMethodKey = typeof DouyinInternalMethods[keyof typeof DouyinInternalMethods]
export type DouyinFetcherMethodKey = typeof DouyinFetcherMethods[keyof typeof DouyinFetcherMethods]

export type KuaishouInternalMethodKey = typeof KuaishouInternalMethods[keyof typeof KuaishouInternalMethods]
export type KuaishouFetcherMethodKey = typeof KuaishouFetcherMethods[keyof typeof KuaishouFetcherMethods]

export type XiaohongshuInternalMethodKey = typeof XiaohongshuInternalMethods[keyof typeof XiaohongshuInternalMethods]
export type XiaohongshuFetcherMethodKey = typeof XiaohongshuFetcherMethods[keyof typeof XiaohongshuFetcherMethods]

// ============================================================================
// 映射表：内部方法名 -> Fetcher 方法名
// ============================================================================

/** B站：内部中文方法名 -> Fetcher 英文方法名 */
export const BilibiliMethodToFetcher: Record<BilibiliInternalMethodKey, BilibiliFetcherMethodKey> = {
  [BilibiliInternalMethods.VIDEO_INFO]: BilibiliFetcherMethods.VIDEO_INFO,
  [BilibiliInternalMethods.VIDEO_STREAM]: BilibiliFetcherMethods.VIDEO_STREAM,
  [BilibiliInternalMethods.VIDEO_DANMAKU]: BilibiliFetcherMethods.VIDEO_DANMAKU,
  [BilibiliInternalMethods.COMMENTS]: BilibiliFetcherMethods.COMMENTS,
  [BilibiliInternalMethods.COMMENT_REPLIES]: BilibiliFetcherMethods.COMMENT_REPLIES,
  [BilibiliInternalMethods.USER_CARD]: BilibiliFetcherMethods.USER_CARD,
  [BilibiliInternalMethods.USER_DYNAMICS]: BilibiliFetcherMethods.USER_DYNAMICS,
  [BilibiliInternalMethods.USER_SPACE_INFO]: BilibiliFetcherMethods.USER_SPACE_INFO,
  [BilibiliInternalMethods.USER_TOTAL_VIEWS]: BilibiliFetcherMethods.USER_TOTAL_VIEWS,
  [BilibiliInternalMethods.DYNAMIC_DETAIL]: BilibiliFetcherMethods.DYNAMIC_DETAIL,
  [BilibiliInternalMethods.DYNAMIC_CARD]: BilibiliFetcherMethods.DYNAMIC_CARD,
  [BilibiliInternalMethods.BANGUMI_INFO]: BilibiliFetcherMethods.BANGUMI_INFO,
  [BilibiliInternalMethods.BANGUMI_STREAM]: BilibiliFetcherMethods.BANGUMI_STREAM,
  [BilibiliInternalMethods.LIVE_ROOM_INFO]: BilibiliFetcherMethods.LIVE_ROOM_INFO,
  [BilibiliInternalMethods.LIVE_ROOM_INIT]: BilibiliFetcherMethods.LIVE_ROOM_INIT,
  [BilibiliInternalMethods.ARTICLE_CONTENT]: BilibiliFetcherMethods.ARTICLE_CONTENT,
  [BilibiliInternalMethods.ARTICLE_CARDS]: BilibiliFetcherMethods.ARTICLE_CARDS,
  [BilibiliInternalMethods.ARTICLE_INFO]: BilibiliFetcherMethods.ARTICLE_INFO,
  [BilibiliInternalMethods.ARTICLE_LIST_INFO]: BilibiliFetcherMethods.ARTICLE_LIST_INFO,
  [BilibiliInternalMethods.LOGIN_STATUS]: BilibiliFetcherMethods.LOGIN_STATUS,
  [BilibiliInternalMethods.LOGIN_QRCODE]: BilibiliFetcherMethods.LOGIN_QRCODE,
  [BilibiliInternalMethods.QRCODE_STATUS]: BilibiliFetcherMethods.QRCODE_STATUS,
  [BilibiliInternalMethods.APPLY_CAPTCHA]: BilibiliFetcherMethods.APPLY_CAPTCHA,
  [BilibiliInternalMethods.VALIDATE_CAPTCHA]: BilibiliFetcherMethods.VALIDATE_CAPTCHA,
  [BilibiliInternalMethods.AV_TO_BV]: BilibiliFetcherMethods.AV_TO_BV,
  [BilibiliInternalMethods.BV_TO_AV]: BilibiliFetcherMethods.BV_TO_AV,
  [BilibiliInternalMethods.EMOJI_LIST]: BilibiliFetcherMethods.EMOJI_LIST
}

/** 抖音：内部中文方法名 -> Fetcher 英文方法名 */
export const DouyinMethodToFetcher: Record<DouyinInternalMethodKey, DouyinFetcherMethodKey> = {
  [DouyinInternalMethods.VIDEO_WORK]: DouyinFetcherMethods.VIDEO_WORK,
  [DouyinInternalMethods.IMAGE_ALBUM_WORK]: DouyinFetcherMethods.IMAGE_ALBUM_WORK,
  [DouyinInternalMethods.SLIDES_WORK]: DouyinFetcherMethods.SLIDES_WORK,
  [DouyinInternalMethods.TEXT_WORK]: DouyinFetcherMethods.TEXT_WORK,
  [DouyinInternalMethods.PARSE_WORK]: DouyinFetcherMethods.PARSE_WORK,
  [DouyinInternalMethods.DANMAKU]: DouyinFetcherMethods.DANMAKU,
  [DouyinInternalMethods.WORK_COMMENTS]: DouyinFetcherMethods.WORK_COMMENTS,
  [DouyinInternalMethods.COMMENT_REPLIES]: DouyinFetcherMethods.COMMENT_REPLIES,
  [DouyinInternalMethods.USER_PROFILE]: DouyinFetcherMethods.USER_PROFILE,
  [DouyinInternalMethods.USER_VIDEO_LIST]: DouyinFetcherMethods.USER_VIDEO_LIST,
  [DouyinInternalMethods.SEARCH]: DouyinFetcherMethods.SEARCH,
  [DouyinInternalMethods.SUGGEST_WORDS]: DouyinFetcherMethods.SUGGEST_WORDS,
  [DouyinInternalMethods.MUSIC_INFO]: DouyinFetcherMethods.MUSIC_INFO,
  [DouyinInternalMethods.LIVE_ROOM_INFO]: DouyinFetcherMethods.LIVE_ROOM_INFO,
  [DouyinInternalMethods.LOGIN_QRCODE]: DouyinFetcherMethods.LOGIN_QRCODE,
  [DouyinInternalMethods.EMOJI_LIST]: DouyinFetcherMethods.EMOJI_LIST,
  [DouyinInternalMethods.DYNAMIC_EMOJI_LIST]: DouyinFetcherMethods.DYNAMIC_EMOJI_LIST
}

/** 快手：内部中文方法名 -> Fetcher 英文方法名 */
export const KuaishouMethodToFetcher: Record<KuaishouInternalMethodKey, KuaishouFetcherMethodKey> = {
  [KuaishouInternalMethods.VIDEO_WORK]: KuaishouFetcherMethods.VIDEO_WORK,
  [KuaishouInternalMethods.WORK_COMMENTS]: KuaishouFetcherMethods.WORK_COMMENTS,
  [KuaishouInternalMethods.EMOJI_LIST]: KuaishouFetcherMethods.EMOJI_LIST
}

/** 小红书：内部中文方法名 -> Fetcher 英文方法名 */
export const XiaohongshuMethodToFetcher: Record<XiaohongshuInternalMethodKey, XiaohongshuFetcherMethodKey> = {
  [XiaohongshuInternalMethods.HOME_FEED]: XiaohongshuFetcherMethods.HOME_FEED,
  [XiaohongshuInternalMethods.NOTE_DETAIL]: XiaohongshuFetcherMethods.NOTE_DETAIL,
  [XiaohongshuInternalMethods.NOTE_COMMENTS]: XiaohongshuFetcherMethods.NOTE_COMMENTS,
  [XiaohongshuInternalMethods.USER_PROFILE]: XiaohongshuFetcherMethods.USER_PROFILE,
  [XiaohongshuInternalMethods.USER_NOTES]: XiaohongshuFetcherMethods.USER_NOTES,
  [XiaohongshuInternalMethods.SEARCH_NOTES]: XiaohongshuFetcherMethods.SEARCH_NOTES,
  [XiaohongshuInternalMethods.EMOJI_LIST]: XiaohongshuFetcherMethods.EMOJI_LIST
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 将内部方法名转换为 Fetcher 方法名
 * @param platform - 平台名称
 * @param internalMethod - 内部方法名 (中文)
 * @returns Fetcher 方法名 (英文)
 */
export function toFetcherMethod (
  platform: 'bilibili' | 'douyin' | 'kuaishou' | 'xiaohongshu',
  internalMethod: string
): string {
  const maps: Record<string, Record<string, string>> = {
    bilibili: BilibiliMethodToFetcher,
    douyin: DouyinMethodToFetcher,
    kuaishou: KuaishouMethodToFetcher,
    xiaohongshu: XiaohongshuMethodToFetcher
  }

  const map = maps[platform]
  if (!map) return internalMethod

  return map[internalMethod] ?? internalMethod
}

/**
 * 获取所有平台的方法名映射
 */
export const MethodMaps = {
  bilibili: {
    internal: BilibiliInternalMethods,
    fetcher: BilibiliFetcherMethods,
    toFetcher: BilibiliMethodToFetcher
  },
  douyin: {
    internal: DouyinInternalMethods,
    fetcher: DouyinFetcherMethods,
    toFetcher: DouyinMethodToFetcher
  },
  kuaishou: {
    internal: KuaishouInternalMethods,
    fetcher: KuaishouFetcherMethods,
    toFetcher: KuaishouMethodToFetcher
  },
  xiaohongshu: {
    internal: XiaohongshuInternalMethods,
    fetcher: XiaohongshuFetcherMethods,
    toFetcher: XiaohongshuMethodToFetcher
  }
} as const
