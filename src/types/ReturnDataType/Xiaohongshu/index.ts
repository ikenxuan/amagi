import type { HomeFeed } from './HomeFeed'
import type { NoteComments } from './NoteComments'
import type { OneNote } from './OneNote'
import type { SearchNotes } from './SearchNotes'
import type { XiaohongshuEmojiList } from './XiaohongshuEmojiList'
import type { XiaohongshuUserProfile } from './XiaohongshuUserProfile'

export * from './HomeFeed'
export * from './NoteComments'
export * from './OneNote'
export * from './SearchNotes'
export * from './XiaohongshuEmojiList'
export * from './XiaohongshuUserProfile'

export interface XiaohongshuReturnTypeMap {
  首页推荐数据: HomeFeed
  单个笔记数据: OneNote
  评论数据: NoteComments
  用户数据: XiaohongshuUserProfile
  用户笔记数据: any
  表情列表: XiaohongshuEmojiList
  搜索笔记: SearchNotes
}
