import type { ArticleCard } from './ArticleCard'
import type { ArticleContent } from './ArticleContent'
import type { ArticleInfo } from './ArticleInfo'
import type { BiliAv2Bv } from './AV2BV'
import type { BiliBangumiVideoInfo } from './BangumiVideoInfo'
import type { BiliBangumiVideoPlayurlIsLogin } from './BangumiVideoPlayurlIsLogin'
import type { BiliBangumiVideoPlayurlNoLogin } from './BangumiVideoPlayurlNoLogin'
import type { BiliCommentReply } from './BiliCommentReply'
import type { BiliBv2AV } from './BV2AV'
import type { ApplyCaptcha, ValidateCaptcha } from './Captcha'
import type { ColumnInfo } from './ColumnInfo'
import type { BiliDynamicCard } from './DynamicCard'
import type { BiliDynamicInfoUnion } from './DynamicInfo'
import type { BiliEmojiList } from './EmojiList'
import type { BiliLiveRoomDef } from './LiveRoomDef'
import type { BiliLiveRoomDetail } from './LiveRoomDetail'
import type { BiliCheckQrcode } from './Login/CheckQrcode'
import type { BiliNewLoginQrcode } from './Login/NewLoginQrcode'
import type { BiliOneWork } from './OneWork'
import type { BiliProtobufDanmaku } from './ProtobufDanmaku'
import type { BiliUserDynamic } from './UserDynamic'
import type { BiliUserFullView } from './UserFullView'
import type { BiliUserProfile } from './UserProfile'
import type { UserSpaceInfo } from './UserSpaceInfo'
import type { BiliVideoPlayurlIsLogin } from './VideoPlayurlIsLogin'
import type { BiliBiliVideoPlayurlNoLogin } from './VideoPlayurlNoLogin'
import type { BiliWorkComments } from './WorkComments'

export * from './ArticleCard'
export * from './ArticleContent'
export * from './ArticleInfo'
export * from './AV2BV'
export * from './BangumiVideoInfo'
export * from './BangumiVideoPlayurlIsLogin'
export * from './BangumiVideoPlayurlNoLogin'
export * from './BiliCommentReply'
export * from './BV2AV'
export * from './ColumnInfo'
export * from './Dynamic'
export * from './DynamicCard'
export * from './DynamicInfo'
export * from './EmojiList'
export * from './LiveRoomDef'
export * from './LiveRoomDetail'
export * from './Login'
export * from './OneWork'
export * from './ProtobufDanmaku'
export * from './UserDynamic'
export * from './UserFullView'
export * from './UserProfile'
export * from './VideoPlayurlIsLogin'
export * from './VideoPlayurlNoLogin'
export * from './WorkComments'

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
  dynamicCard: BiliDynamicCard
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
