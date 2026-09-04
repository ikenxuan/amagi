import type { KsDanmaku } from './Danmaku/index'
import type { KsEmojiList } from './EmojiList/index'
import type { KsLiveRoomInfo } from './LiveRoomDetail/index'
import type { KsOneWork } from './OneWork/index'
import type { KsUserProfile } from './UserProfile'
import type { KsUserWorkList } from './UserWorkList'
import type { KsWorkComments } from './WorkComments/index'

export * from './Danmaku/index'
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
  /**
   * 免签精简版与完整版**共用**一份类型。
   *
   * 不是偷懒：`KsOneWork` 里那几个只有完整版才有的键（`mp4Url` / `photos` /
   * `comments`）本来就声明成可选的，正是为了同时描述两种响应。给精简版单开一份
   * 类型只会多一处会漂移的重复。
   */
  videoWorkSimple: KsOneWork
  comments: KsWorkComments
  danmaku: KsDanmaku
  emojiList: KsEmojiList
  userProfile: KsUserProfile
  userWorkList: KsUserWorkList
  liveRoomInfo: KsLiveRoomInfo
}
