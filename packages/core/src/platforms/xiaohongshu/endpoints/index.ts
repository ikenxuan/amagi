import type { Registry } from '../../../contracts/endpoint'
import { emojiList } from './emojiList'
import { homeFeed } from './homeFeed'
import { noteComments } from './noteComments'
import { noteDetail } from './noteDetail'
import { searchNotes } from './searchNotes'
import { userNoteList } from './userNoteList'
import { userProfile } from './userProfile'

/**
 * 小红书端点注册表。
 *
 * 注册表含 7 条路由：
 * `/fetch_home_feed` / `/fetch_one_note` / `/fetch_note_comments` /
 * `/fetch_user_profile` / `/fetch_user_notes` / `/fetch_emoji_list` /
 * `/fetch_search_notes`。
 */
export const xiaohongshuRegistry = {
  homeFeed,
  noteDetail,
  noteComments,
  userProfile,
  userNoteList,
  emojiList,
  searchNotes
} as const satisfies Registry

export { emojiList, homeFeed, noteComments, noteDetail, searchNotes, userNoteList, userProfile }
export type { UserProfileData } from './userProfile'
