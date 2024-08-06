type VideoInfoParams = {
  /** ID类型 */
  id_type: 'bvid' | 'aid'
  /** 稿件ID */
  id: string
}

type VideoStreamParams = {
  /** 稿件AVID */
  avid: string
  /** 稿件cid */
  cid: string
}
type CommentParams = {
  /** 评论区类型，type参数详见https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码 */
  type: number | string
  /** 稿件ID，也就是AVID */
  oid: number | string
}
type BangumiInfoParams = {
  /** 稿件ID是否为epid */
  isep: boolean | undefined
  /** 稿件id，season_id与ep_id任选其一 */
  id: string
}
type BangumiStreamParams = {
  /** 稿件cid */
  cid: string
  /** 稿件ep_id */
  ep_id: string
}
type UserParams = {
  /** UP主UID */
  host_mid: string
}
type DynamicParams = {
  /** 动态ID */
  dynamic_id: string
}
type LiveRoomParams = {
  /** 直播间ID */
  room_id: string
}
type QrcodeParams = {
  /** 扫码登录秘钥 */
  qrcode_key: string
}

/** 抖音API接口参数类型 */
export type BilibiliAPIParams = {
  VideoInfoParams: VideoInfoParams
  VideoStreamParams: VideoStreamParams
  CommentParams: CommentParams
  BangumiInfoParams: BangumiInfoParams
  BangumiStreamParams: BangumiStreamParams
  UserParams: UserParams
  DynamicParams: DynamicParams
  LiveRoomParams: LiveRoomParams
  QrcodeParams: QrcodeParams
}