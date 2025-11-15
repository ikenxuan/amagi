import type { ArticleCard } from './ArticleCard'
import type { ArticleContent } from './ArticleContent'
import type { ArticleInfo } from './ArticleInfo'
import type { BiliAv2Bv } from './AV2BV'
import type { BiliBangumiVideoInfo } from './BangumiVideoInfo'
import type { BiliBangumiVideoPlayurlIsLogin } from './BangumiVideoPlayurlIsLogin'
import type { BiliBangumiVideoPlayurlNoLogin } from './BangumiVideoPlayurlNoLogin'
import type { BiliCommentReply } from './BiliCommentReply'
import type { BiliBv2AV } from './BV2AV'
import type { ColumnInfo } from './ColumnInfo'
import type { BiliDynamicCard } from './DynamicCard'
import type { BiliDynamicInfoUnion } from './DynamicInfo'
import type { BiliEmojiList } from './EmojiList'
import type { BiliLiveRoomDef } from './LiveRoomDef'
import type { BiliLiveRoomDetail } from './LiveRoomDetail'
import type { BiliCheckQrcode } from './Login/CheckQrcode'
import type { BiliNewLoginQrcode } from './Login/NewLoginQrcode'
import type { BiliOneWork } from './OneWork'
import type { BiliUserDynamic } from './UserDynamic'
import type { BiliUserFullView } from './UserFullView'
import type { BiliUserProfile } from './UserProfile'
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
export * from './UserDynamic'
export * from './UserFullView'
export * from './UserProfile'
export * from './VideoPlayurlIsLogin'
export * from './VideoPlayurlNoLogin'
export * from './WorkComments'

export interface BilibiliReturnTypeMap {
  单个视频作品数据: BiliOneWork
  单个视频下载信息数据: BiliVideoPlayurlIsLogin | BiliBiliVideoPlayurlNoLogin
  评论数据: BiliWorkComments
  指定评论的回复: BiliCommentReply
  用户主页数据: BiliUserProfile
  用户主页动态列表数据: BiliUserDynamic
  Emoji数据: BiliEmojiList
  番剧基本信息数据: BiliBangumiVideoInfo
  番剧下载信息数据: BiliBangumiVideoPlayurlIsLogin | BiliBangumiVideoPlayurlNoLogin
  动态详情数据: BiliDynamicInfoUnion
  动态卡片数据: BiliDynamicCard
  直播间信息: BiliLiveRoomDetail
  直播间初始化信息: BiliLiveRoomDef
  登录基本信息: any
  申请二维码: BiliNewLoginQrcode
  二维码状态: BiliCheckQrcode
  获取UP主总播放量: BiliUserFullView
  AV转BV: BiliAv2Bv
  BV转AV: BiliBv2AV
  专栏正文内容: ArticleContent
  专栏显示卡片信息: ArticleCard
  专栏文章基本信息: ArticleInfo
  文集基本信息: ColumnInfo
}
