import type { HomeFeed } from './HomeFeed/index'
import type { NoteComments } from './NoteComments/index'
import type { OneNote } from './OneNote/index'
import type { SearchNotes } from './SearchNotes/index'
import type { XiaohongshuEmojiList } from './XiaohongshuEmojiList/index'
import type { XiaohongshuUserProfile } from './XiaohongshuUserProfile/index'

export * from './HomeFeed/index'
export * from './NoteComments/index'
export * from './OneNote/index'
export * from './SearchNotes/index'
export * from './XiaohongshuEmojiList/index'
export * from './XiaohongshuUserProfile/index'

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
