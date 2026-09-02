import type { Registry } from '../../../contracts/endpoint'
import { comments } from './comments'
import { emojiList } from './emojiList'
import { liveRoomInfo } from './liveRoomInfo'
import { userProfile } from './userProfile'
import { userWorkList } from './userWorkList'
import { videoWork } from './videoWork'

/**
 * 快手端点注册表。
 *
 * 判据：`Object.keys(registry).length === 6`，路由与 v6 逐条一致：
 * `/fetch_one_work` / `/fetch_work_comments` / `/fetch_user_profile` /
 * `/fetch_user_work_list` / `/fetch_live_room_info` / `/fetch_emoji_list`。
 */
export const kuaishouRegistry = {
  videoWork,
  comments,
  userProfile,
  userWorkList,
  liveRoomInfo,
  emojiList
} as const satisfies Registry

export { comments, emojiList, liveRoomInfo, userProfile, userWorkList, videoWork }
export type { CommentsData } from './comments'
export type { EmojiListData } from './emojiList'
export type { LiveRoomInfoData } from './liveRoomInfo'
export type { UserProfileData } from './userProfile'
export type { UserWorkListData } from './userWorkList'
export type { VideoWorkData } from './videoWork'
