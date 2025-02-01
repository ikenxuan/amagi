import {
  Av2Bv,
  BangumiVideoInfo,
  BangumiVideoPlayurl,
  Bv2AV,
  CheckQrcode,
  DynamicCard,
  DynamicInfo,
  EmojiList,
  LiveRoomDef,
  LiveRoomDetail,
  NewLoginQrcode,
  OneWork,
  UserDynamic,
  UserFullView,
  UserProfile,
  VideoPlayurl,
  WorkComments
} from './ReturnDataType/Bilibili'

export interface BilibiliMethodOptionsMap {
  VideoInfoParams: {
    methodType: '单个视频作品数据'
    /** 稿件BVID */
    bvid: string
  },
  VideoStreamParams: {
    methodType: '单个视频下载信息数据'
    /** 稿件AVID */
    avid: number
    /** 稿件cid */
    cid: number
  },
  CommentParams: {
    methodType: '评论数据'
    /** 评论区类型代码，详见 [评论区类型代码](https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81) */
    type: number
    /** 稿件ID，也就是AV号去除前缀后的内容 */
    oid: number
    /**
     * 获取的评论数量，默认20
     * @defaultValue 20
     */
    number?: number
    /**
     * 评论区页码，默认1
     * @defaultValue 1
     */
    pn?: number
  },
  UserParams: {
    methodType: '用户主页数据' | '用户主页动态列表数据' | '获取UP主总播放量'
    /** UP主UID */
    host_mid: string
  },
  DynamicParams: {
    methodType: '动态详情数据' | '动态卡片数据'
    /** 动态ID */
    dynamic_id: string
  },
  BangumiInfoParams: {
    methodType: '番剧基本信息数据'
    /** 稿件ep_id，其含义为 {@link https://www.bilibili.com/anime/index | 番剧索引} 或 **我的追番** 中的番剧，对应网址中包含ss号，如：{@link https://www.bilibili.com/bangumi/play/ss33802} */
    season_id?: string
    /** 稿件ep_id，番剧的某一集，对应网址中包含ep号，如：{@link https://www.bilibili.com/bangumi/play/ep330798} */
    ep_id?: string
  },
  BangumiStreamParams: {
    methodType: '番剧下载信息数据'
    /** 稿件cid */
    cid: number
    /** 稿件ep_id，番剧的某一集，对应网址中包含ep号，如：{@link https://www.bilibili.com/bangumi/play/ep330798} */
    ep_id: string
  },
  LiveRoomParams: {
    methodType: '直播间信息' | '直播间初始化信息'
    /** 直播间ID */
    room_id: string
  },
  QrcodeParams: {
    methodType: '二维码状态'
    /** 扫码登录秘钥 */
    qrcode_key: string
  },
  EmojiParams: {
    methodType: 'Emoji数据'
  },
  LoginBaseInfoParams: {
    methodType: '登录基本信息'
  },
  GetQrcodeParams: {
    methodType: '申请二维码'
  },
  Bv2AvParams: {
    methodType: 'BV转AV'
    /** 视频BV号 */
    bvid: string
  },
  Av2BvParams: {
    methodType: 'AV转BV'
    /** 视频AV号 */
    avid: number
  },
}

/** B站API接口参数类型 */
export interface BilibiliDataOptionsMap {
  单个视频作品数据: { opt: BilibiliMethodOptionsMap['VideoInfoParams'], data: OneWork },
  单个视频下载信息数据: { opt: BilibiliMethodOptionsMap['VideoStreamParams'], data: VideoPlayurl },
  评论数据: { opt: BilibiliMethodOptionsMap['CommentParams'], data: WorkComments },
  用户主页数据: { opt: BilibiliMethodOptionsMap['UserParams'], data: UserProfile },
  用户主页动态列表数据: { opt: BilibiliMethodOptionsMap['UserParams'], data: UserDynamic },
  Emoji数据: { opt: BilibiliMethodOptionsMap['EmojiParams'], data: EmojiList },
  番剧基本信息数据: { opt: BilibiliMethodOptionsMap['BangumiInfoParams'], data: BangumiVideoInfo },
  番剧下载信息数据: { opt: BilibiliMethodOptionsMap['BangumiStreamParams'], data: BangumiVideoPlayurl },
  动态详情数据: { opt: BilibiliMethodOptionsMap['DynamicParams'], data: DynamicInfo },
  动态卡片数据: { opt: BilibiliMethodOptionsMap['DynamicParams'], data: DynamicCard },
  直播间信息: { opt: BilibiliMethodOptionsMap['LiveRoomParams'], data: LiveRoomDetail },
  直播间初始化信息: { opt: BilibiliMethodOptionsMap['LiveRoomParams'], data: LiveRoomDef },
  登录基本信息: { opt: BilibiliMethodOptionsMap['LoginBaseInfoParams'], data: any },
  申请二维码: { opt: BilibiliMethodOptionsMap['GetQrcodeParams'], data: NewLoginQrcode },
  二维码状态: { opt: BilibiliMethodOptionsMap['QrcodeParams'], data: CheckQrcode },
  获取UP主总播放量: { opt: BilibiliMethodOptionsMap['UserParams'], data: UserFullView },
  AV转BV: { opt: BilibiliMethodOptionsMap['Av2BvParams'], data: Av2Bv },
  BV转AV: { opt: BilibiliMethodOptionsMap['Bv2AvParams'], data: Bv2AV },
}
