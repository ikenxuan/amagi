import type { ArticleWork } from './ArticleWork/index'
import type { CommentReply } from './CommentReply/index'
import type { DyDanmakuList } from './DyDanmakuList/index'
import type { DyEmojiList } from './EmojiList/index'
import type { DyEmojiProList } from './EmojiProList/index'
import type { DyEmojiResourceMeta } from './EmojiResourceMeta/index'
import type { DyGuestMusicAwemeList } from './GuestMusicAwemeList/index'
import type { DyGuestMusicInfo } from './GuestMusicInfo/index'
import type { DyGuestUserInfo } from './GuestUserInfo/index'
import type { DyImageAlbumWork } from './ImageAlbumWork/index'
import type { DyLoginQrcode } from './LoginQrcode/index'
import type { DyMusicWork } from './MusicWork/index'
import type { DyPassportQrcode, DyPassportQrcodeStatus, DyPassportSendCode, DyPassportValidateCode } from './PassportLogin/index'
import type { SearchInfoGeneralData, SearchInfoUser, SearchInfoVideo } from './SearchInfo'
import type { DySlidesWork } from './SlidesWork/index'
import type { DySuggestWords } from './SuggestWords/index'
import type { DyUserFavoriteList } from './UserFavoriteList/index'
import type { DyUserInfo } from './UserInfo/index'
import type { DyUserLiveVideos } from './UserLiveVideos/index'
import type { DyUserPostVideos } from './UserPostVideos/index'
import type { UserRecommendList } from './UserRecommendList/index'
import type { DyVideoWork } from './VideoWork/index'
import type { DyWorkComments } from './WorkComments/index'

// 搜索数据的联合类型
export type DySearchInfo = SearchInfoGeneralData | SearchInfoUser | SearchInfoVideo

export * from './ArticleWork/index'
export * from './CommentReply/index'
export * from './DyDanmakuList/index'
export * from './EmojiList/index'
export * from './EmojiProList/index'
export * from './EmojiResourceMeta/index'
export * from './GuestMusicAwemeList/index'
export * from './GuestMusicInfo/index'
export * from './GuestUserInfo/index'
export * from './ImageAlbumWork/index'
export * from './LoginQrcode/index'
export * from './MusicWork/index'
export * from './PassportLogin/index'
export * from './SearchInfo/index'
export * from './SlidesWork/index'
export * from './SuggestWords/index'
export * from './UserInfo/index'
export * from './UserLiveVideos/index'
export * from './UserPostVideos/index'
export * from './VideoWork/index'
export * from './WorkComments/index'

/**
 * 抖音返回类型映射
 *
 * 将 methodType 映射到对应的返回数据类型
 */
export interface DouyinReturnTypeMap {
  parseWork: DyVideoWork | DyImageAlbumWork | DySlidesWork | (DyImageAlbumWork & ArticleWork)
  textWork: ArticleWork
  videoWork: DyVideoWork
  imageAlbumWork: DyImageAlbumWork
  slidesWork: DySlidesWork
  comments: DyWorkComments
  userProfile: DyUserInfo
  userVideoList: DyUserPostVideos
  userFavoriteList: DyUserFavoriteList
  userRecommendList: UserRecommendList
  suggestWords: DySuggestWords
  search: DySearchInfo
  emojiList: DyEmojiList
  dynamicEmojiList: DyEmojiProList
  danmakuList: DyDanmakuList
  musicInfo: DyMusicWork
  liveRoomInfo: DyUserLiveVideos
  loginQrcode: DyLoginQrcode
  commentReplies: CommentReply
  passportQrcode: DyPassportQrcode
  passportQrcodeStatus: DyPassportQrcodeStatus
  passportSendCode: DyPassportSendCode
  passportValidateCode: DyPassportValidateCode
  /** iesdouyin v2 原样响应，字段怎么读由调用方决定 */
  guestUserInfo: DyGuestUserInfo
  /** iesdouyin v2 原样响应，字段怎么读由调用方决定 */
  guestMusicInfo: DyGuestMusicInfo
  /** iesdouyin v2 原样响应，字段怎么读由调用方决定 */
  guestMusicAwemeList: DyGuestMusicAwemeList
  /** App 资源包元信息原样响应 */
  emojiResourceMeta: DyEmojiResourceMeta
}
