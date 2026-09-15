import type { KsDanmaku } from './Danmaku/index'
import type { KsEmojiList } from './EmojiList/index'
import type { KsLiveRoomInfo } from './LiveRoomDetail/index'
import type { KsOneWork } from './OneWork/index'
import type { KsUserProfile } from './UserProfile/index'
import type { KsUserWorkList } from './UserWorkList/index'
import type { KsWorkComments } from './WorkComments/index'

export * from './Danmaku/index'
export * from './EmojiList/index'
export * from './LiveRoomDetail/index'
export * from './OneWork/index'
export * from './UserProfile/index'
export * from './UserWorkList/index'
export * from './WorkComments/index'

/**
 * 快手返回类型映射
 */
export interface KuaishouReturnTypeMap {
  videoWork: KsOneWork
  /**
   * 完整版与免签主通道**共用**一份类型。
   *
   * 不是偷懒：`KsOneWork` 里那几个只有完整版才有的键（`mp4Url` / `photos` /
   * `comments`）本来就声明成可选的，正是为了同时描述两种响应。给其中一条单开
   * 一份类型只会多一处会漂移的重复。
   *
   * 另一层现实：那三个键在两个仓库共 15 份响应样本里出现 **0 次**，corpus 也
   * 录不到（完整版稳定撞 `2001`）—— 所以「完整版类型更宽」目前只体现在声明上。
   */
  videoWorkFull: KsOneWork
  comments: KsWorkComments
  danmakuList: KsDanmaku
  emojiList: KsEmojiList
  userProfile: KsUserProfile
  userWorkList: KsUserWorkList
  liveRoomInfo: KsLiveRoomInfo
}
