import type { Registry } from '../../../contracts/endpoint'
import { comments } from './comments'
import { danmakuList } from './danmakuList'
import { emojiList } from './emojiList'
import { liveRoomInfo } from './liveRoomInfo'
import { userProfile } from './userProfile'
import { userWorkList } from './userWorkList'
import { videoWork } from './videoWork'
import { videoWorkSimple } from './videoWorkSimple'

/**
 * 快手端点注册表。
 *
 * 判据：`Object.keys(registry).length === 8`，前 6 条路由与 v6 逐条一致：
 * `/fetch_one_work` / `/fetch_work_comments` / `/fetch_user_profile` /
 * `/fetch_user_work_list` / `/fetch_live_room_info` / `/fetch_emoji_list`。
 *
 * 第 7 条 `/fetch_one_work_simple` 是 H5 迁移新增的**免签兜底**：签名是逆向产物，
 * 快手改前端 sig4 就会让 `videoWork` 回 `result=50`，而这条不参与签名。
 *
 * 第 8 条 `/fetch_danmaku_list` 是弹幕。它**完全免鉴权**（不签名、不要 cookie），
 * 与 H5 迁移无关，只是这一批一起补上的能力。
 */
export const kuaishouRegistry = {
  videoWork,
  videoWorkSimple,
  comments,
  danmakuList,
  userProfile,
  userWorkList,
  liveRoomInfo,
  emojiList
} as const satisfies Registry

export { comments, danmakuList, emojiList, liveRoomInfo, userProfile, userWorkList, videoWork, videoWorkSimple }
