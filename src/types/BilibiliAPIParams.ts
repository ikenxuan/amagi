type VideoInfoParams = {
  /**
   * 视频分享URL。建议使用 id_type 和 id 字段作为参数，url参数可能不稳定
   * @deprecated
   */
  url?: string
  /** 稿件 ID 类型，一般为 bvid */
  id_type?: 'bvid' | 'avid'
  /** 稿件ID */
  id?: string
}

type AVIDVideoInfoParams = {
  id_type: 'avid' | undefined
  /** 稿件AVID */
  id: number | undefined
}

type BVIDVideoInfoParams = {
  id_type: 'bvid' | undefined
  /** 稿件BVID */
  id: string | undefined
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
  type: number | undefined
  /** 稿件ID，也就是AV号去除前缀后的内容 */
  oid: number | undefined
  /** 获取的评论数量，默认最高20 */
  number?: number
  /**
   * 评论区页码
   * @default 1
   */
  pn?: number
}
type BangumiInfoParams = {
  /** 稿件ID是否为epid */
  isep: boolean | undefined
  /** 稿件id，season_id与ep_id任选其一 */
  id: string | undefined
}
type BangumiStreamParams = {
  /** 稿件cid */
  cid: string | undefined
  /** 稿件ep_id */
  ep_id: string | undefined
}
type UserParams = {
  /** UP主UID */
  host_mid: string | undefined
}
type DynamicParams = {
  /** 动态ID */
  dynamic_id: string | undefined
}
type LiveRoomParams = {
  /** 直播间ID */
  room_id: string | undefined
}
type QrcodeParams = {
  /** 扫码登录秘钥 */
  qrcode_key: string | undefined
}

export interface BilibiliDataOptionsMapKeys {
  VideoInfoParams: AVIDVideoInfoParams | BVIDVideoInfoParams,
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
