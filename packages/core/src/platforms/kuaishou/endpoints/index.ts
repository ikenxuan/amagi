import type { Registry } from '../../../contracts/endpoint'
import { comments } from './comments'
import { danmakuList } from './danmakuList'
import { emojiList } from './emojiList'
import { liveRoomInfo } from './liveRoomInfo'
import { userProfile } from './userProfile'
import { userWorkList } from './userWorkList'
import { videoWork } from './videoWork'
import { videoWorkFull } from './videoWorkFull'

/**
 * 快手端点注册表。
 *
 * 判据：`Object.keys(registry).length === 8`，前 6 条路由与 v6 逐条一致：
 * `/fetch_one_work` / `/fetch_work_comments` / `/fetch_user_profile` /
 * `/fetch_user_work_list` / `/fetch_live_room_info` / `/fetch_emoji_list`。
 *
 * 第 7 条 `/fetch_one_work_full` 是完整版 `photo/info`。它**当前稳定撞 `2001`
 * 风控**，所以主通道 `/fetch_one_work` 走的是免签的 `ugH5App/photo/simple/info`
 * —— 依据是快手自己的分享页 SSR 就用那一条（详见 `videoWork.ts` /
 * `videoWorkFull.ts` 的 JSDoc）。这个主次在 2026-09-05 与迁移当初写的相反，
 * 是实测推翻的结果，不是笔误。
 *
 * 第 8 条 `/fetch_danmaku_list` 是弹幕。它**完全免鉴权**（不签名、不要 cookie），
 * 与 H5 迁移无关，只是这一批一起补上的能力。
 */
export const kuaishouRegistry = {
  videoWork,
  videoWorkFull,
  comments,
  danmakuList,
  userProfile,
  userWorkList,
  liveRoomInfo,
  emojiList
} as const satisfies Registry

export { comments, danmakuList, emojiList, liveRoomInfo, userProfile, userWorkList, videoWork, videoWorkFull }
