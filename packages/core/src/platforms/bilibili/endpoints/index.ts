import type { Registry } from '../../../contracts/endpoint'
import { articleCards } from './articleCards'
import { articleContent } from './articleContent'
import { articleInfo } from './articleInfo'
import { articleListInfo } from './articleListInfo'
import { avToBv } from './avToBv'
import { bangumiInfo } from './bangumiInfo'
import { bangumiStream } from './bangumiStream'
import { bvToAv } from './bvToAv'
import { captchaFromVoucher } from './captchaFromVoucher'
import { commentReplies } from './commentReplies'
import { comments } from './comments'
import { dynamicDetail } from './dynamicDetail'
import { emojiList } from './emojiList'
import { liveRoomInfo } from './liveRoomInfo'
import { liveRoomInit } from './liveRoomInit'
import { loginQrcode } from './loginQrcode'
import { loginStatus } from './loginStatus'
import { qrcodeStatus } from './qrcodeStatus'
import { uploaderTotalViews } from './uploaderTotalViews'
import { userCard } from './userCard'
import { userDynamicList } from './userDynamicList'
import { userLiveStatus } from './userLiveStatus'
import { userSpaceInfo } from './userSpaceInfo'
import { validateCaptcha } from './validateCaptcha'
import { videoDanmaku } from './videoDanmaku'
import { videoInfo } from './videoInfo'
import { videoStream } from './videoStream'

/**
 * B站端点注册表。
 *
 * 判据：`Object.keys(registry).length === 27`，路由与 v6 逐条一致。
 */
export const bilibiliRegistry = {
  videoInfo,
  videoStream,
  videoDanmaku,
  comments,
  commentReplies,
  userCard,
  userDynamicList,
  userLiveStatus,
  userSpaceInfo,
  uploaderTotalViews,
  dynamicDetail,
  bangumiInfo,
  bangumiStream,
  liveRoomInfo,
  liveRoomInit,
  articleContent,
  articleCards,
  articleInfo,
  articleListInfo,
  loginStatus,
  loginQrcode,
  qrcodeStatus,
  captchaFromVoucher,
  validateCaptcha,
  avToBv,
  bvToAv,
  emojiList
} as const satisfies Registry

export {
  articleCards,
  articleContent,
  articleInfo,
  articleListInfo,
  avToBv,
  bangumiInfo,
  bangumiStream,
  bvToAv,
  captchaFromVoucher,
  commentReplies,
  comments,
  dynamicDetail,
  emojiList,
  liveRoomInfo,
  liveRoomInit,
  loginQrcode,
  loginStatus,
  qrcodeStatus,
  uploaderTotalViews,
  userCard,
  userDynamicList,
  userLiveStatus,
  userSpaceInfo,
  validateCaptcha,
  videoDanmaku,
  videoInfo,
  videoStream
}
export type { AvToBvData } from './avToBv'
export type { BvToAvData } from './bvToAv'
export type { CommentsData } from './comments'
export type { DanmakuData } from './videoDanmaku'
export type { EmojiListData } from './emojiList'
export type { QrcodeStatusData } from './qrcodeStatus'
export type { VideoInfoData } from './videoInfo'
export type { VideoStreamData } from './videoStream'
