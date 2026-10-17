import type { Registry } from '../../../contracts/endpoint'
import { commentReplies } from './commentReplies'
import { comments } from './comments'
import { danmakuList } from './danmakuList'
import { emojiList } from './emojiList'
import { emotionPackageList } from './emotionPackageList'
import { liveRoomInfo } from './liveRoomInfo'
import { loginUserProfile } from './loginUserProfile'
import { searchUser } from './searchUser'
import { searchWorkList } from './searchWorkList'
import { slideFeed } from './slideFeed'
import { userProfile } from './userProfile'
import { userWorkList } from './userWorkList'
import { videoWork } from './videoWork'
import { videoWorkFull } from './videoWorkFull'

/**
 * 快手端点注册表。
 *
 * 注册表含 14 条路由，前 6 条为：
 * `/fetch_one_work` / `/fetch_work_comments` / `/fetch_user_profile` /
 * `/fetch_user_work_list` / `/fetch_live_room_info` / `/fetch_emoji_list`。
 *
 * 第 7 条 `/fetch_one_work_full` 是完整版 `photo/info`。它**当前稳定撞 `2001`
 * 风控**，所以主通道 `/fetch_one_work` 走的是免签的 `ugH5App/photo/simple/info`
 * —— 依据是快手自己的分享页 SSR 就用那一条（详见 `videoWork.ts` /
 * `videoWorkFull.ts` 的 JSDoc）。
 *
 * 第 8 条 `/fetch_danmaku_list` 是弹幕。它**完全免鉴权**（不签名、不要 cookie）。
 *
 * 第 9 条 `/fetch_comment_replies` 是评论回复，走 PC GraphQL `visionSubCommentList`。
 * 免签、不要登录态，但要浏览器激活过的 `did`（详见 `commentReplies.ts` 的 JSDoc）。
 *
 * 第 10 条 `/fetch_emotion_package_list` 是表情包列表，走 PC REST
 * `www.kuaishou.com/rest/k/emotion/package/list`，实测零凭证可取（详见 `emotionPackageList.ts`）。
 *
 * 第 11 条 `/fetch_slide_feed` 是作品相关推荐，走 H5 免签 `ugH5App/slide/feed`。
 * 返回的 `feeds` 是作品项与推荐卡片混排的异构数组（详见 `slideFeed.ts`）。
 *
 * 第 12~14 条是 PC REST 用户搜索、作品搜索和当前账号资料。
 * 两条搜索支持官网注册后的游客 cookie；当前账号资料需要登录。
 * 请求均使用 `__NS_hxfalcon`，凭据来源与实测边界见 `api.ts`、`guestCookie.ts`。
 */
export const kuaishouRegistry = {
  videoWork,
  videoWorkFull,
  comments,
  commentReplies,
  danmakuList,
  userProfile,
  userWorkList,
  liveRoomInfo,
  emojiList,
  emotionPackageList,
  slideFeed,
  searchUser,
  searchWorkList,
  loginUserProfile
} as const satisfies Registry

export {
  commentReplies,
  comments,
  danmakuList,
  emojiList,
  emotionPackageList,
  liveRoomInfo,
  loginUserProfile,
  searchUser,
  searchWorkList,
  slideFeed,
  userProfile,
  userWorkList,
  videoWork,
  videoWorkFull
}
