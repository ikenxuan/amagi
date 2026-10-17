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
 * 抖音端点注册表。
 *
 * 共 26 条路由，路由唯一：5 个作品端点拆成 5 条独立路由
 * （`parseWork` 保留 `/fetch_one_work`）。
 *
 * 末尾 4 条是**免鉴权**端点（`sign: false` + `dropHeaders` 去掉 cookie）。
 * 它们与前面 22 条走同一条管线，所以事件、trace、信封形状一致。
 *
 * `shortUrl` 是例外：免登录**但仍要签名**（`sign: douyinBogus(184)`），
 * 所以按签名端点计数；它不在免鉴权那 4 条里。
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
  shortUrl,
  musicInfo,
  musicAwemeList,
  mixAweme,
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
  musicAwemeList,
  musicInfo,
  mixAweme,
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
