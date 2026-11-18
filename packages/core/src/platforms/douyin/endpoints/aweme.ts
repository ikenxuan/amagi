import type { Registry } from '../../../contracts/endpoint'
import { appCommentReplies } from './appCommentReplies'
import { appComments } from './appComments'
import { appDanmakuList } from './appDanmakuList'
import { appDynamicEmojiList } from './appDynamicEmojiList'
import { appEmojiResourceMeta } from './appEmojiResourceMeta'
import { appFeed } from './appFeed'
import { appImageAlbumWork } from './appImageAlbumWork'
import { appLiveRoomInfo } from './appLiveRoomInfo'
import { appMixAweme } from './appMixAweme'
import { appMusicAwemeList } from './appMusicAwemeList'
import { appMusicInfo } from './appMusicInfo'
import { appParseWork } from './appParseWork'
import { appSearch } from './appSearch'
import { appShortUrl } from './appShortUrl'
import { appSlidesWork } from './appSlidesWork'
import { appSuggestWords } from './appSuggestWords'
import { appTextWork } from './appTextWork'
import { appUserFavoriteList } from './appUserFavoriteList'
import { appUserProfile } from './appUserProfile'
import { appUserRecommendList } from './appUserRecommendList'
import { appUserVideoList } from './appUserVideoList'
import { appVideoWork } from './appVideoWork'

/** 抖音 Android 数据接口；新 SDK 位于 douyin.app，兼容 Fetcher 仍在 fetcher.aweme 下；HTTP 路由使用 app_ 前缀。 */
export const awemeRegistry = {
  appParseWork,
  appVideoWork,
  appImageAlbumWork,
  appSlidesWork,
  appTextWork,
  appComments,
  appCommentReplies,
  appUserProfile,
  appUserVideoList,
  appUserFavoriteList,
  appUserRecommendList,
  appMusicInfo,
  appMusicAwemeList,
  appMixAweme,
  appSuggestWords,
  appSearch,
  appLiveRoomInfo,
  appEmojiResourceMeta,
  appDynamicEmojiList,
  appShortUrl,
  appFeed,
  appDanmakuList
} as const satisfies Registry
export {
  appParseWork,
  appVideoWork,
  appImageAlbumWork,
  appSlidesWork,
  appTextWork,
  appComments,
  appCommentReplies,
  appUserProfile,
  appUserVideoList,
  appUserFavoriteList,
  appUserRecommendList,
  appSearch,
  appSuggestWords,
  appMusicInfo,
  appMusicAwemeList,
  appMixAweme,
  appLiveRoomInfo,
  appEmojiResourceMeta,
  appDynamicEmojiList,
  appDanmakuList,
  appShortUrl,
  appFeed
}
