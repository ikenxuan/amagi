import type { Registry } from '../../../contracts/endpoint'
import { emojiList } from './emojiList'
import { homeFeed } from './homeFeed'
import { liveRoom } from './liveRoom'
import { liveSquare } from './liveSquare'
import { liveStatus } from './liveStatus'
import { noteComments } from './noteComments'
import { noteDetail } from './noteDetail'
import { searchHotList } from './searchHotList'
import { searchNotes } from './searchNotes'
import { searchUser } from './searchUser'
import { subComments } from './subComments'
import { userNoteList } from './userNoteList'
import { userProfile } from './userProfile'

/** 小红书 v7 端点注册表：请求方法、HTTP 路由和文档均由这里派生。 */
export const xiaohongshuRegistry = {
  homeFeed,
  noteDetail,
  noteComments,
  userProfile,
  userNoteList,
  emojiList,
  searchNotes,
  searchUser,
  searchHotList,
  subComments,
  liveRoom,
  liveStatus,
  liveSquare
} as const satisfies Registry

export { emojiList, homeFeed, noteComments, noteDetail, searchNotes, userNoteList, userProfile }

export { searchUser, searchHotList, subComments, liveRoom, liveStatus, liveSquare }
