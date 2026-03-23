import type { KsEmojiList } from './EmojiList'
import type { KsLiveRoomInfo } from './LiveRoomDetail'
import type { KsOneWork } from './OneWork'
import type { KsUserProfile } from './UserProfile'
import type { KsUserWorkList } from './UserWorkList'
import type { KsWorkComments } from './WorkComments'

export * from './EmojiList'
export * from './LiveRoomDetail'
export * from './OneWork'
export * from './UserHomeDetail'
export * from './UserProfile'
export * from './UserWorkList'
export * from './WorkComments'

/**
 * 快手返回类型映射
 */
export interface KuaishouReturnTypeMap {
  videoWork: KsOneWork
  comments: KsWorkComments
  emojiList: KsEmojiList
  userProfile: KsUserProfile
  userWorkList: KsUserWorkList
  liveRoomInfo: KsLiveRoomInfo
}
