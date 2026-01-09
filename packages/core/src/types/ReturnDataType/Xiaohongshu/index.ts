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

/**
 * 小红书返回类型映射
 */
export interface XiaohongshuReturnTypeMap {
  homeFeed: HomeFeed
  noteDetail: OneNote
  noteComments: NoteComments
  userProfile: XiaohongshuUserProfile
  userNoteList: any
  emojiList: XiaohongshuEmojiList
  searchNotes: SearchNotes
}
