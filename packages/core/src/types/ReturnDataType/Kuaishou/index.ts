import type { KsEmojiList } from './EmojiList/index'
import type { KsLiveRoomInfo } from './LiveRoomDetail/index'
import type { KsOneWork } from './OneWork/index'
import type { KsUserProfile } from './UserProfile'
import type { KsUserWorkList } from './UserWorkList'
import type { KsWorkComments } from './WorkComments/index'

export * from './EmojiList/index'
export * from './LiveRoomDetail/index'
export * from './OneWork/index'
export * from './UserProfile'
export * from './UserWorkList'
export * from './WorkComments/index'

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
