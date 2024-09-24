type VideoInfoParams = {
  /**
   * 视频分享URL。建议使用 id_type 和 id 字段作为参数，url参数可能不稳定
   * @deprecated
   */
  url?: string
  /** 稿件 ID 类型，一般为 bvid */
  id_type?: 'bvid' | 'aid'
  /** 稿件ID */
  id?: string
}

type VideoStreamParams = {
  /** 视频分享URL。建议使用 id_type 和 id 字段作为参数，url参数可能不稳定 */
  url?: string
  /** 稿件AVID */
  avid?: string
  /** 稿件cid */
  cid?: string
}
type CommentParams = {
  /** 评论区类型，type参数详见https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码 */
  type?: number | string
  /** 评论区类型，type参数详见https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码 */
  commentstype?: number | string
  /** 稿件ID，也就是AVID */
  oid?: number | string
  /** 获取的评论数量，默认最高20 */
  number?: number | string
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
  host_mid: string | number
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

export interface BilibiliDataOptionsMapKeys {
  VideoInfoParams: VideoInfoParams,
  VideoStreamParams: VideoStreamParams,
  CommentParams: CommentParams,
  UserParams: UserParams,
  DynamicParams: DynamicParams,
  BangumiInfoParams: BangumiInfoParams,
  BangumiStreamParams: BangumiStreamParams,
  LiveRoomParams: LiveRoomParams,
  QrcodeParams: QrcodeParams,
}

/** B站API接口参数类型 */
export type BilibiliDataOptionsMap = {
  '单个视频作品数据': VideoInfoParams,
  '单个视频下载信息数据': VideoStreamParams,
  '评论数据': CommentParams,
  '用户主页数据': UserParams,
  '用户主页动态列表数据': UserParams,
  'emoji数据': {},
  '番剧基本信息数据': BangumiInfoParams,
  '番剧下载信息数据': BangumiStreamParams,
  '动态详情数据': DynamicParams,
  '动态卡片数据': DynamicParams,
  '直播间信息': LiveRoomParams,
  '直播间初始化信息': LiveRoomParams,
  '登录基本信息': {},
  '申请二维码': {},
  '二维码状态': QrcodeParams
}
