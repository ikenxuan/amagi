import type { Registry } from '../../../../contracts/endpoint'
import { commentReplies } from './commentReplies'
import { comments } from './comments'
import { danmakuList } from './danmakuList'
import { dynamicEmojiList } from './dynamicEmojiList'
import { emojiResource } from './emojiResource'
import { guestEmojiResource } from './emojiResourceGuest'
import { feed } from './feed'
import { imageAlbumWork } from './imageAlbumWork'
import { liveRoomInfo } from './liveRoomInfo'
import { mixAweme } from './mixAweme'
import { musicAwemeList } from './musicAwemeList'
import { musicInfo } from './musicInfo'
import { parseWork } from './parseWork'
import { search } from './search'
import { shortUrl } from './shortUrl'
import { slidesWork } from './slidesWork'
import { suggestWords } from './suggestWords'
import { textWork } from './textWork'
import { userFavoriteList } from './userFavoriteList'
import { userProfile } from './userProfile'
import { userRecommendList } from './userRecommendList'
import { userVideoList } from './userVideoList'
import { videoWork } from './videoWork'

/**
 * 抖音签名版 App 端点注册表。
 *
 * 键名保留历史的 `app` 前缀：`EndpointDef.name`、`API_NAMES` 与
 * `client.douyin.app` 的方法名都从这些键派生，公开面不随目录调整而改变。
 */
export const awemeRegistry = {
  appParseWork: parseWork,
  appVideoWork: videoWork,
  appImageAlbumWork: imageAlbumWork,
  appSlidesWork: slidesWork,
  appTextWork: textWork,
  appComments: comments,
  appCommentReplies: commentReplies,
  appUserProfile: userProfile,
  appUserVideoList: userVideoList,
  appUserFavoriteList: userFavoriteList,
  appUserRecommendList: userRecommendList,
  appMusicInfo: musicInfo,
  appMusicAwemeList: musicAwemeList,
  appMixAweme: mixAweme,
  appSuggestWords: suggestWords,
  appSearch: search,
  appLiveRoomInfo: liveRoomInfo,
  appEmojiResourceMeta: emojiResource,
  appDynamicEmojiList: dynamicEmojiList,
  appShortUrl: shortUrl,
  appFeed: feed,
  appDanmakuList: danmakuList
} as const satisfies Registry
/** 历史免签 Android 资源接口，与新版签名接口并列。 */
export const douyinGuestAppRegistry = { emojiResourceMeta: guestEmojiResource } as const satisfies Registry
export const douyinAppRegistry = { ...awemeRegistry, ...douyinGuestAppRegistry } as const satisfies Registry

export {
  commentReplies,
  comments,
  danmakuList,
  dynamicEmojiList,
  emojiResource,
  feed,
  guestEmojiResource,
  imageAlbumWork,
  liveRoomInfo,
  mixAweme,
  musicAwemeList,
  musicInfo,
  parseWork,
  search,
  shortUrl,
  slidesWork,
  suggestWords,
  textWork,
  userFavoriteList,
  userProfile,
  userRecommendList,
  userVideoList,
  videoWork
}

/** 兼容别名：保留带 `app` 前缀的旧导出名，避免既有 import 断裂。 */
export {
  commentReplies as appCommentReplies,
  comments as appComments,
  danmakuList as appDanmakuList,
  dynamicEmojiList as appDynamicEmojiList,
  emojiResource as appEmojiResourceMeta,
  feed as appFeed,
  imageAlbumWork as appImageAlbumWork,
  liveRoomInfo as appLiveRoomInfo,
  mixAweme as appMixAweme,
  musicAwemeList as appMusicAwemeList,
  musicInfo as appMusicInfo,
  parseWork as appParseWork,
  search as appSearch,
  shortUrl as appShortUrl,
  slidesWork as appSlidesWork,
  suggestWords as appSuggestWords,
  textWork as appTextWork,
  userFavoriteList as appUserFavoriteList,
  userProfile as appUserProfile,
  userRecommendList as appUserRecommendList,
  userVideoList as appUserVideoList,
  videoWork as appVideoWork
}
export { guestEmojiResource as emojiResourceMeta }
