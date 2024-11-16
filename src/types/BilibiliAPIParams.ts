export interface BilibiliAPIOptionsMap {
  VideoInfoParams:
  {
    id_type: 'avid'
    /** 稿件AVID */
    id: number
  } | {
    id_type: 'bvid'
    /** 稿件BVID */
    id: string
  },
  VideoStreamParams: {
    /** 视频分享URL。建议使用 id_type 和 id 字段作为参数，url参数可能不稳定 */
    url?: string
    /** 稿件AVID */
    avid?: number
    /** 稿件cid */
    cid?: number
  },
  CommentParams: {
    /** 评论区类型，type参数详见https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码 */
    type: number
    /** 稿件ID，也就是AV号去除前缀后的内容 */
    oid: number
    /**
     * 获取的评论数量，默认20
     * @default 20
     */
    number?: number
    /**
     * 评论区页码，默认1
     * @default 1
     */
    pn?: number
  },
  UserParams: {
    /** UP主UID */
    host_mid: string
  },
  DynamicParams: {
    /** 动态ID */
    dynamic_id: string
  },
  BangumiInfoParams: {
    /** 稿件ID是否为epid */
    isep: boolean
    /** 稿件id，season_id与ep_id任选其一 */
    id: string
  },
  BangumiStreamParams: {
    /** 稿件cid */
    cid: number
    /** 稿件ep_id */
    ep_id: string
  },
  LiveRoomParams: {
    /** 直播间ID */
    room_id: string
  },
  QrcodeParams: {
    /** 扫码登录秘钥 */
    qrcode_key: string
  },
}

/** B站API接口参数类型 */
export interface BilibiliDataOptionsMap {
  '单个视频作品数据': BilibiliAPIOptionsMap['VideoInfoParams'],
  '单个视频下载信息数据': BilibiliAPIOptionsMap['VideoStreamParams'],
  '评论数据': BilibiliAPIOptionsMap['CommentParams'],
  '用户主页数据': BilibiliAPIOptionsMap['UserParams'],
  '用户主页动态列表数据': BilibiliAPIOptionsMap['UserParams'],
  'Emoji数据': any,
  '番剧基本信息数据': BilibiliAPIOptionsMap['BangumiInfoParams'],
  '番剧下载信息数据': BilibiliAPIOptionsMap['BangumiStreamParams'],
  '动态详情数据': BilibiliAPIOptionsMap['DynamicParams'],
  '动态卡片数据': BilibiliAPIOptionsMap['DynamicParams'],
  '直播间信息': BilibiliAPIOptionsMap['LiveRoomParams'],
  '直播间初始化信息': BilibiliAPIOptionsMap['LiveRoomParams'],
  '登录基本信息': any,
  '申请二维码': any,
  '二维码状态': BilibiliAPIOptionsMap['QrcodeParams'],
  '获取UP主总播放量': BilibiliAPIOptionsMap['UserParams'],
}
