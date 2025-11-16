import type { CommentReply } from './CommentReply'
import type { DyDanmakuList } from './DyDanmakuList'
import type { DyEmojiList } from './EmojiList'
import type { DyEmojiProList } from './EmojiProList'
import type { DyImageAlbumWork } from './ImageAlbumWork'
import type { DyMusicWork } from './MusicWork'
import type { DySearchInfo } from './SearchInfo'
import type { DySlidesWork } from './SlidesWork'
import type { DySuggestWords } from './SuggestWords'
import type { DyTextWork } from './TextWork'
import type { DyUserInfo } from './UserInfo'
import type { DyUserLiveVideos } from './UserLiveVideos'
import type { DyUserPostVideos } from './UserPostVideos'
import type { DyVideoWork } from './VideoWork'
import type { DyWorkComments } from './WorkComments'

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

export interface DouyinReturnTypeMap {
  聚合解析: DyVideoWork | DyImageAlbumWork | DySlidesWork | DyImageAlbumWork & DyTextWork
  文字作品数据: DyTextWork
  视频作品数据: DyVideoWork
  图集作品数据: DyImageAlbumWork
  合辑作品数据: DySlidesWork
  评论数据: DyWorkComments
  用户主页数据: DyUserInfo
  用户主页视频列表数据: DyUserPostVideos
  热点词数据: DySuggestWords
  搜索数据: DySearchInfo
  Emoji数据: DyEmojiList
  动态表情数据: DyEmojiProList
  弹幕数据: DyDanmakuList
  音乐数据: DyMusicWork
  直播间信息数据: DyUserLiveVideos
  申请二维码数据: any
  指定评论回复数据: CommentReply
}
