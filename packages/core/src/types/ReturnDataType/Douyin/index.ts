import type { CommentReply } from './CommentReply'
import type { DyDanmakuList } from './DyDanmakuList'
import type { DyEmojiList } from './EmojiList'
import type { DyEmojiProList } from './EmojiProList'
import type { DyImageAlbumWork } from './ImageAlbumWork'
import type { DyMusicWork } from './MusicWork'
import type { SearchInfoGeneralData, SearchInfoUser, SearchInfoVideo } from './SearchInfo'
import type { DySlidesWork } from './SlidesWork'
import type { DySuggestWords } from './SuggestWords'
import type { DyTextWork } from './TextWork'
import { UserFavoriteList } from './UserFavoriteList'
import type { DyUserInfo } from './UserInfo'
import type { DyUserLiveVideos } from './UserLiveVideos'
import type { DyUserPostVideos } from './UserPostVideos'
import { UserRecommendList } from './UserRecommendList'
import type { DyVideoWork } from './VideoWork'
import type { DyWorkComments } from './WorkComments'

// 搜索数据的联合类型
export type DySearchInfo = SearchInfoGeneralData | SearchInfoUser | SearchInfoVideo

export * from './CommentReply'
export * from './DyDanmakuList'
export * from './EmojiList'
export * from './EmojiProList'
export * from './ImageAlbumWork'
export * from './MusicWork'
export * from './SearchInfo'
export * from './SlidesWork'
export * from './SuggestWords'
export * from './TextWork'
export * from './UserInfo'
export * from './UserLiveVideos'
export * from './UserPostVideos'
export * from './VideoWork'
export * from './WorkComments'

/**
 * 抖音返回类型映射
 *
 * 将 methodType 映射到对应的返回数据类型
 */
export interface DouyinReturnTypeMap {
  parseWork: DyVideoWork | DyImageAlbumWork | DySlidesWork | DyImageAlbumWork & DyTextWork
  textWork: DyTextWork
  videoWork: DyVideoWork
  imageAlbumWork: DyImageAlbumWork
  slidesWork: DySlidesWork
  comments: DyWorkComments
  userProfile: DyUserInfo
  userVideoList: DyUserPostVideos
  userFavoriteList: UserFavoriteList
  userRecommendList: UserRecommendList
  suggestWords: DySuggestWords
  search: DySearchInfo
  emojiList: DyEmojiList
  dynamicEmojiList: DyEmojiProList
  danmakuList: DyDanmakuList
  musicInfo: DyMusicWork
  liveRoomInfo: DyUserLiveVideos
  loginQrcode: any
  commentReplies: CommentReply
}
