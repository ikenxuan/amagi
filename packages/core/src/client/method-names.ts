import type { EndpointName } from '../contracts/endpoint'
import type { Platform } from '../contracts/platform'

/**
 * 端点名 → v6 方法名的映射。
 *
 * **全仓唯一一处手写映射。** 其余派生物（参数类型、校验、路由、fetcher 方法集合、
 * bound fetcher、文档清单）都从 registry 推出来，只有这张表必须手写 ——
 * 因为方法名里有 16 个不规则形式，不可能用「`fetch` + 首字母大写」拼出来：
 * 15 个来自 v6 的命名（`parseWork` 没有 `fetch` 前缀、`comments` 叫
 * `fetchWorkComments`、`search` 叫 `searchContent`、`avToBv` 叫 `convertAvToBv` …），
 * 第 16 个是新增端点 `kuaishou.danmaku` 为与抖音的 `fetchDanmakuList` 对齐。
 *
 * 这张表漏一个，就等于某个 v6 方法在 v7 里凭空消失。所以
 * `test/client/method-names.test.ts` 直接拿四个平台的**活 fetcher 对象**
 * 逐个核对（那些方法名由 `test/contract/fetcher-surface.test.ts` 的快照锁死）。
 *
 * 抖音 passport 的 4 个方法（`requestPassportQrcode` / `checkPassportQrcode` /
 * `sendPassportVerifyCode` / `validatePassportVerifyCode`）**不在这里** ——
 * 它们是会话而不是端点，归阶段 5 的 `session/` 处理。
 */
export const METHOD_NAMES = {
  // ─────────────── douyin：19 个 ───────────────
  'douyin.videoWork': 'fetchVideoWork',
  'douyin.imageAlbumWork': 'fetchImageAlbumWork',
  'douyin.slidesWork': 'fetchSlidesWork',
  'douyin.textWork': 'fetchTextWork',
  /** ⚠️ 不规则：没有 `fetch` 前缀 */
  'douyin.parseWork': 'parseWork',
  /** ⚠️ 不规则：`comments` → `fetchWorkComments` */
  'douyin.comments': 'fetchWorkComments',
  'douyin.commentReplies': 'fetchCommentReplies',
  'douyin.danmakuList': 'fetchDanmakuList',
  'douyin.userProfile': 'fetchUserProfile',
  'douyin.userVideoList': 'fetchUserVideoList',
  'douyin.userFavoriteList': 'fetchUserFavoriteList',
  'douyin.userRecommendList': 'fetchUserRecommendList',
  /** ⚠️ 不规则：`search` → `searchContent` */
  'douyin.search': 'searchContent',
  'douyin.suggestWords': 'fetchSuggestWords',
  'douyin.musicInfo': 'fetchMusicInfo',
  'douyin.liveRoomInfo': 'fetchLiveRoomInfo',
  'douyin.emojiList': 'fetchEmojiList',
  'douyin.dynamicEmojiList': 'fetchDynamicEmojiList',
  /** ⚠️ 不规则：`request` 前缀 */
  'douyin.loginQrcode': 'requestLoginQrcode',

  // ─────────────── bilibili：27 个 ───────────────
  'bilibili.videoInfo': 'fetchVideoInfo',
  /** ⚠️ 不规则：多了 `Url` 后缀 */
  'bilibili.videoStream': 'fetchVideoStreamUrl',
  'bilibili.videoDanmaku': 'fetchVideoDanmaku',
  'bilibili.comments': 'fetchComments',
  'bilibili.commentReplies': 'fetchCommentReplies',
  'bilibili.userCard': 'fetchUserCard',
  'bilibili.userDynamicList': 'fetchUserDynamicList',
  'bilibili.userLiveStatus': 'fetchUserLiveStatus',
  'bilibili.userSpaceInfo': 'fetchUserSpaceInfo',
  'bilibili.uploaderTotalViews': 'fetchUploaderTotalViews',
  'bilibili.dynamicDetail': 'fetchDynamicDetail',
  'bilibili.bangumiInfo': 'fetchBangumiInfo',
  /** ⚠️ 不规则：多了 `Url` 后缀 */
  'bilibili.bangumiStream': 'fetchBangumiStreamUrl',
  'bilibili.liveRoomInfo': 'fetchLiveRoomInfo',
  /** ⚠️ 不规则：多了 `Info` 后缀 */
  'bilibili.liveRoomInit': 'fetchLiveRoomInitInfo',
  'bilibili.articleContent': 'fetchArticleContent',
  'bilibili.articleCards': 'fetchArticleCards',
  'bilibili.articleInfo': 'fetchArticleInfo',
  'bilibili.articleListInfo': 'fetchArticleListInfo',
  'bilibili.loginStatus': 'fetchLoginStatus',
  'bilibili.emojiList': 'fetchEmojiList',
  /** ⚠️ 不规则：`request` 前缀 */
  'bilibili.loginQrcode': 'requestLoginQrcode',
  /** ⚠️ 不规则：`check` 前缀 */
  'bilibili.qrcodeStatus': 'checkQrcodeStatus',
  /** ⚠️ 不规则：`convert` 前缀 */
  'bilibili.avToBv': 'convertAvToBv',
  /** ⚠️ 不规则：`convert` 前缀 */
  'bilibili.bvToAv': 'convertBvToAv',
  /** ⚠️ 不规则：`request` 前缀 */
  'bilibili.captchaFromVoucher': 'requestCaptchaFromVoucher',
  /** ⚠️ 不规则：`validate` 前缀 + `Result` 后缀 */
  'bilibili.validateCaptcha': 'validateCaptchaResult',

  // ─────────────── kuaishou：8 个 ───────────────
  'kuaishou.videoWork': 'fetchVideoWork',
  /** H5 免签兜底：`photo/info` 因签名失效而不可用时的降级入口 */
  'kuaishou.videoWorkSimple': 'fetchVideoWorkSimple',
  'kuaishou.userProfile': 'fetchUserProfile',
  'kuaishou.userWorkList': 'fetchUserWorkList',
  'kuaishou.liveRoomInfo': 'fetchLiveRoomInfo',
  'kuaishou.emojiList': 'fetchEmojiList',
  /** ⚠️ 不规则：`comments` → `fetchWorkComments` */
  'kuaishou.comments': 'fetchWorkComments',
  /** ⚠️ 不规则：`danmaku` → `fetchDanmakuList`，与抖音的同名方法对齐 */
  'kuaishou.danmaku': 'fetchDanmakuList',

  // ─────────────── xiaohongshu：7 个 ───────────────
  'xiaohongshu.homeFeed': 'fetchHomeFeed',
  'xiaohongshu.noteDetail': 'fetchNoteDetail',
  'xiaohongshu.noteComments': 'fetchNoteComments',
  'xiaohongshu.userProfile': 'fetchUserProfile',
  'xiaohongshu.userNoteList': 'fetchUserNoteList',
  'xiaohongshu.emojiList': 'fetchEmojiList',
  /** ⚠️ 不规则：没有 `fetch` 前缀 */
  'xiaohongshu.searchNotes': 'searchNotes'
} as const satisfies Record<EndpointName, string>

/** 映射表里已登记的端点全名 */
export type MappedEndpointName = keyof typeof METHOD_NAMES

/** 某个端点全名对应的 v6 方法名（类型层查表，供 `FetcherOf` 用） */
export type MethodNameOf<Full extends string> = Full extends MappedEndpointName ? (typeof METHOD_NAMES)[Full] : never

/**
 * 拼端点全名
 * @param platform - 平台
 * @param endpoint - 端点短名
 * @returns `'<platform>.<endpoint>'`
 */
export const fullNameOf = (platform: Platform, endpoint: string): EndpointName => `${platform}.${endpoint}`

/**
 * 查某个端点的 v6 方法名
 * @param platform - 平台
 * @param endpoint - 端点短名
 * @returns v6 方法名；没登记则 `undefined`
 */
export const methodNameOf = (platform: Platform, endpoint: string): string | undefined =>
  (METHOD_NAMES as Record<string, string>)[fullNameOf(platform, endpoint)]

/**
 * 取某个平台的全部映射
 * @param platform - 平台
 * @returns 端点短名 → v6 方法名
 */
export const methodNamesOf = (platform: Platform): Record<string, string> => {
  const prefix = `${platform}.`
  const out: Record<string, string> = {}
  for (const [full, method] of Object.entries(METHOD_NAMES)) {
    if (full.startsWith(prefix)) out[full.slice(prefix.length)] = method
  }
  return out
}
