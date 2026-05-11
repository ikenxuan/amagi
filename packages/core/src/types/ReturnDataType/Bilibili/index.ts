// BiliDynamicCard，B站动态卡片API接口返回类型，已于 `2025-08-09` 被B站官方删除，现返回错误信息提示接口已停用，请使用动态详情接口替代。
// import type { BiliDynamicCard } from './DynamicCard'
import type { ErrorResult } from 'amagi/validation'

import type { ArticleCard } from './ArticleCard/index'
import type { ArticleContent } from './ArticleContent/index'
import type { ArticleInfo } from './ArticleInfo/index'
import type { BiliAv2Bv } from './AV2BV/index'
import type { BiliBangumiVideoInfo } from './BangumiVideoInfo'
import type { BiliBangumiVideoPlayurlIsLogin } from './BangumiVideoPlayurlIsLogin/index'
import type { BiliBangumiVideoPlayurlNoLogin } from './BangumiVideoPlayurlNoLogin/index'
import type { BiliCommentReply } from './BiliCommentReply/index'
import type { BiliBv2AV } from './BV2AV/index'
import type { ApplyCaptcha, ValidateCaptcha } from './Captcha/index'
import type { ColumnInfo } from './ColumnInfo/index'
import type { BiliDynamicInfoUnion } from './DynamicInfo/index'
import type { BiliEmojiList } from './EmojiList/index'
import type { BiliLiveRoomDef } from './LiveRoomDef/index'
import type { BiliLiveRoomDetail } from './LiveRoomDetail/index'
import type { BiliCheckQrcode, BiliNewLoginQrcode } from './Login/index'
import type { BiliOneWork } from './OneWork/index'
import type { BiliProtobufDanmaku } from './ProtobufDanmaku/index'
import type { BiliUserDynamic } from './UserDynamic/index'
import type { BiliUserFullView } from './UserFullView/index'
import type { BiliUserProfile } from './UserProfile/index'
import type { UserSpaceInfo } from './UserSpaceInfo'
import type { BiliVideoPlayurlIsLogin } from './VideoPlayurlIsLogin/index'
import type { BiliBiliVideoPlayurlNoLogin } from './VideoPlayurlNoLogin/index'
import type { BiliWorkComments } from './WorkComments/index'

export * from './ArticleCard/index'
export * from './ArticleContent/index'
export * from './ArticleInfo/index'
export * from './AV2BV/index'
export * from './BangumiVideoInfo/index'
export * from './BangumiVideoPlayurlIsLogin/index'
export * from './BangumiVideoPlayurlNoLogin/index'
export * from './BiliCommentReply/index'
export * from './BV2AV/index'
export * from './ColumnInfo/index'
export * from './Dynamic/index'
export * from './DynamicCard/index'
export * from './DynamicInfo/index'
export * from './EmojiList/index'
export * from './LiveRoomDef/index'
export * from './LiveRoomDetail/index'
export * from './Login/index'
export * from './OneWork/index'
export * from './ProtobufDanmaku/index'
export * from './UserDynamic/index'
export * from './UserFullView/index'
export * from './UserProfile/index'
export * from './VideoPlayurlIsLogin/index'
export * from './VideoPlayurlNoLogin/index'
export * from './WorkComments/index'

/**
 * B站返回类型映射
 *
 * 将 methodType 映射到对应的返回数据类型
 */
export interface BilibiliReturnTypeMap {
  videoInfo: BiliOneWork
  videoStream: BiliVideoPlayurlIsLogin | BiliBiliVideoPlayurlNoLogin
  comments: BiliWorkComments
  commentReplies: BiliCommentReply
  userCard: BiliUserProfile
  userDynamicList: BiliUserDynamic
  userSpaceInfo: UserSpaceInfo
  emojiList: BiliEmojiList
  bangumiInfo: BiliBangumiVideoInfo
  bangumiStream: BiliBangumiVideoPlayurlIsLogin | BiliBangumiVideoPlayurlNoLogin
  dynamicDetail: BiliDynamicInfoUnion
  /** @deprecated 接口已停用，现返回错误信息 */
  dynamicCard: ErrorResult
  liveRoomInfo: BiliLiveRoomDetail
  liveRoomInit: BiliLiveRoomDef
  loginStatus: any
  loginQrcode: BiliNewLoginQrcode
  qrcodeStatus: BiliCheckQrcode
  uploaderTotalViews: BiliUserFullView
  avToBv: BiliAv2Bv
  bvToAv: BiliBv2AV
  articleContent: ArticleContent
  articleCards: ArticleCard
  articleInfo: ArticleInfo
  articleListInfo: ColumnInfo
  captchaFromVoucher: ApplyCaptcha
  validateCaptcha: ValidateCaptcha
  videoDanmaku: BiliProtobufDanmaku
}
