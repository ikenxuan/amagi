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
 * 判据：`Object.keys(registry).length === 7`，路由与 v6 逐条一致：
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
// `UserNoteListData` 已删：形状搬到 `types/ReturnDataType/Xiaohongshu/XiaohongshuUserNoteList`
// 成了映射条目本身，这里再留一个别名就是两个名字描述同一份声明 —— 迟早漂移。
// 它从来不在 `package.json` 的 `exports` 覆盖范围内（只有 `.` / `express` / `axios`
// / `chalk` / `compat` 五个入口），所以删掉不动公开面。
export type { UserProfileData } from './userProfile'
