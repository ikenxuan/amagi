import type { Registry } from '../../../contracts/endpoint'
import { commentReplies } from './commentReplies'
import { comments } from './comments'
import { danmakuList } from './danmakuList'
import { dynamicEmojiList } from './dynamicEmojiList'
import { emojiList } from './emojiList'
import { emojiResourceMeta } from './emojiResourceMeta'
import { guestMusicAwemeList } from './guestMusicAwemeList'
import { guestMusicInfo } from './guestMusicInfo'
import { guestUserInfo } from './guestUserInfo'
import { imageAlbumWork } from './imageAlbumWork'
import { liveRoomInfo } from './liveRoomInfo'
import { loginQrcode } from './loginQrcode'
import { musicInfo } from './musicInfo'
import { parseWork } from './parseWork'
import { search } from './search'
import { slidesWork } from './slidesWork'
import { suggestWords } from './suggestWords'
import { textWork } from './textWork'
import { userFavoriteList } from './userFavoriteList'
import { userProfile } from './userProfile'
import { userRecommendList } from './userRecommendList'
import { userVideoList } from './userVideoList'
import { videoWork } from './videoWork'

/**
 * 抖音端点注册表。
 *
 * 判据：`Object.keys(registry).length === 23`，路由唯一（修 #47/#48/#54）：
 * 5 个作品端点拆成 5 条独立路由（`parseWork` 保留 `/fetch_one_work`）。
 *
 * 末尾 4 条是**免鉴权**端点（`sign: false` + `dropHeaders` 去掉 cookie），
 * 来自 #188。它们与前面 19 条走同一条管线，所以事件、trace、信封形状一致。
 */
//#region docs-registry
export const douyinRegistry = {
  parseWork,
  videoWork,
  imageAlbumWork,
  slidesWork,
  textWork,
  comments,
  commentReplies,
  userProfile,
  userVideoList,
  userFavoriteList,
  userRecommendList,
  search,
  suggestWords,
  musicInfo,
  liveRoomInfo,
  loginQrcode,
  emojiList,
  dynamicEmojiList,
  danmakuList,
  guestUserInfo,
  guestMusicInfo,
  guestMusicAwemeList,
  emojiResourceMeta
} as const satisfies Registry
//#endregion

export {
  commentReplies,
  comments,
  danmakuList,
  dynamicEmojiList,
  emojiList,
  emojiResourceMeta,
  guestMusicAwemeList,
  guestMusicInfo,
  guestUserInfo,
  imageAlbumWork,
  liveRoomInfo,
  loginQrcode,
  musicInfo,
  parseWork,
  search,
  slidesWork,
  suggestWords,
  textWork,
  userFavoriteList,
  userProfile,
  userRecommendList,
  userVideoList,
  videoWork
}
