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
    /** 稿件ep_id，从地址获取 */
    ep_id: string
  },
  BangumiStreamParams: {
    methodType: '番剧下载信息数据'
    /** 稿件cid */
    cid: number
    /** 稿件ep_id */
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
  单个视频作品数据: BilibiliMethodOptionsMap['VideoInfoParams'],
  单个视频下载信息数据: BilibiliMethodOptionsMap['VideoStreamParams'],
  评论数据: BilibiliMethodOptionsMap['CommentParams'],
  用户主页数据: BilibiliMethodOptionsMap['UserParams'],
  用户主页动态列表数据: BilibiliMethodOptionsMap['UserParams'],
  Emoji数据: BilibiliMethodOptionsMap['EmojiParams'],
  番剧基本信息数据: BilibiliMethodOptionsMap['BangumiInfoParams'],
  番剧下载信息数据: BilibiliMethodOptionsMap['BangumiStreamParams'],
  动态详情数据: BilibiliMethodOptionsMap['DynamicParams'],
  动态卡片数据: BilibiliMethodOptionsMap['DynamicParams'],
  直播间信息: BilibiliMethodOptionsMap['LiveRoomParams'],
  直播间初始化信息: BilibiliMethodOptionsMap['LiveRoomParams'],
  登录基本信息: BilibiliMethodOptionsMap['LoginBaseInfoParams'],
  申请二维码: BilibiliMethodOptionsMap['GetQrcodeParams'],
  二维码状态: BilibiliMethodOptionsMap['QrcodeParams'],
  获取UP主总播放量: BilibiliMethodOptionsMap['UserParams'],
  AV转BV: BilibiliMethodOptionsMap['Av2BvParams'],
  BV转AV: BilibiliMethodOptionsMap['Bv2AvParams'],
}

// export interface BilibiliDataOptionsMap {
//   单个视频作品数据: Omit<BilibiliMethodOptionsMap['VideoInfoParams'], 'methodType'>,
//   单个视频下载信息数据: Omit<BilibiliMethodOptionsMap['VideoStreamParams'], 'methodType'>,
//   评论数据: Omit<BilibiliMethodOptionsMap['CommentParams'], 'methodType'>,
//   用户主页数据: Omit<BilibiliMethodOptionsMap['UserParams'], 'methodType'>,
//   用户主页动态列表数据: Omit<BilibiliMethodOptionsMap['UserParams'], 'methodType'>,
//   Emoji数据: any,
//   番剧基本信息数据: Omit<BilibiliMethodOptionsMap['BangumiInfoParams'], 'methodType'>,
//   番剧下载信息数据: Omit<BilibiliMethodOptionsMap['BangumiStreamParams'], 'methodType'>,
//   动态详情数据: Omit<BilibiliMethodOptionsMap['DynamicParams'], 'methodType'>,
//   动态卡片数据: Omit<BilibiliMethodOptionsMap['DynamicParams'], 'methodType'>,
//   直播间信息: Omit<BilibiliMethodOptionsMap['LiveRoomParams'], 'methodType'>,
//   直播间初始化信息: Omit<BilibiliMethodOptionsMap['LiveRoomParams'], 'methodType'>,
//   登录基本信息: any,
//   申请二维码: any,
//   二维码状态: Omit<BilibiliMethodOptionsMap['QrcodeParams'], 'methodType'>,
//   获取UP主总播放量: Omit<BilibiliMethodOptionsMap['UserParams'], 'methodType'>,
// }
