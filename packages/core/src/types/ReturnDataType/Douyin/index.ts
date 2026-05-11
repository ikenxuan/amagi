import type { ArticleWork } from './ArticleWork/index'
import type { CommentReply } from './CommentReply/index'
import type { DyDanmakuList } from './DyDanmakuList/index'
import type { DyEmojiList } from './EmojiList/index'
import type { DyEmojiProList } from './EmojiProList/index'
import type { DyImageAlbumWork } from './ImageAlbumWork/index'
import type { DyMusicWork } from './MusicWork/index'
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
export * from './ImageAlbumWork/index'
export * from './MusicWork/index'
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
  parseWork: DyVideoWork | DyImageAlbumWork | DySlidesWork | DyImageAlbumWork & ArticleWork
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
  loginQrcode: any
  commentReplies: CommentReply
}
