/**
 * B站 API 参数类型定义
 *
 * 定义所有 B站 API 方法的参数接口和类型映射
 *
 * @module types/BilibiliAPIParams
 */

/**
 * B站 API 方法参数映射接口
 *
 * 每个键对应一种 API 方法，值为该方法所需的参数接口
 */
export interface BilibiliMethodOptionsMap {
  /** 获取单个视频信息 */
  VideoInfoParams: {
    methodType: 'videoInfo'
    /** 稿件BVID */
    bvid: string
  }

  /** 获取视频流下载信息 */
  VideoStreamParams: {
    methodType: 'videoStream'
    /** 稿件AVID */
    avid: number
    /** 稿件cid */
    cid: number
  }

  /** 获取评论数据 */
  CommentParams: {
    methodType: 'comments'
    /** 评论区类型代码，详见 [评论区类型代码](https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81) */
    type: CommentType
    /** 稿件ID，也就是AV号去除前缀后的内容 */
    oid: string
    /**
     * 获取的评论数量，默认20
     * @defaultValue 20
     */
    number?: number
    /**
     * 排序方式
     * 默认为3
     * 0和3: 仅热度
     * 1: 按热度+按时间
     * 2: 仅时间
     * @defaultValue 3
     */
    mode?: 0 | 1 | 2 | 3
    /**
     * 翻页信息，用于懒加载分页
     * 首次请求时不传，后续请求使用上次响应中的 data.cursor.pagination_reply.next_offset
     */
    pagination_str?: string
    /**
     * 平台类型
     * @defaultValue 1
     */
    plat?: number
    /** 当获取第一页评论时存在 */
    seek_rpid?: string
    /**
     * web位置参数
     * @defaultValue 1315875
     */
    web_location?: string
  }

  /** 获取指定评论的回复 */
  CommentReplyParams: {
    methodType: 'commentReplies'
    /** 评论区类型代码，详见 [评论区类型代码](https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81) */
    type: CommentType
    /** 目标评论区 ID，也就是AV号去除前缀后的内容 */
    oid: string
    /** 根评论ID */
    root: string
    /**
     * 获取的评论数量，默认20
     * @defaultValue 20
     */
    number?: number
  }

  /** 获取用户相关数据 */
  UserParams: {
    methodType: 'userCard' | 'userDynamicList' | 'uploaderTotalViews' | 'userSpaceInfo'
    /** UP主UID */
    host_mid: number
  }

  /** 获取动态数据 */
  DynamicParams: {
    methodType: 'dynamicDetail' | 'dynamicCard'
    /** 动态ID */
    dynamic_id: string
  }

  /** 获取番剧基本信息 */
  BangumiInfoParams: {
    methodType: 'bangumiInfo'
    /** 稿件ep_id，其含义为 {@link https://www.bilibili.com/anime/index | 番剧索引} 或 **我的追番** 中的番剧，对应网址中包含ss号，如：{@link https://www.bilibili.com/bangumi/play/ss33802} */
    season_id?: string
    /** 稿件ep_id，番剧的某一集，对应网址中包含ep号，如：{@link https://www.bilibili.com/bangumi/play/ep330798} */
    ep_id?: string
  }

  /** 获取番剧视频流信息 */
  BangumiStreamParams: {
    methodType: 'bangumiStream'
    /** 稿件cid */
    cid: number
    /** 稿件ep_id，番剧的某一集，对应网址中包含ep号，如：{@link https://www.bilibili.com/bangumi/play/ep330798} */
    ep_id: string
  }

  /** 获取直播间信息 */
  LiveRoomParams: {
    methodType: 'liveRoomInfo' | 'liveRoomInit'
    /** 直播间ID */
    room_id: string
  }

  /** 查询二维码状态 */
  QrcodeParams: {
    methodType: 'qrcodeStatus'
    /** 扫码登录秘钥 */
    qrcode_key: string
  }

  /** 获取表情列表 */
  EmojiParams: {
    methodType: 'emojiList'
  }

  /** 获取登录基本信息 */
  LoginBaseInfoParams: {
    methodType: 'loginStatus'
  }

  /** 申请登录二维码 */
  GetQrcodeParams: {
    methodType: 'loginQrcode'
  }

  /** BV号转AV号 */
  Bv2AvParams: {
    methodType: 'bvToAv'
    /** 视频BV号 */
    bvid: string
  }

  /** AV号转BV号 */
  Av2BvParams: {
    methodType: 'avToBv'
    /** 视频AV号 */
    avid: number
  }

  /** 获取专栏正文内容 */
  ArticleParams: {
    methodType: 'articleContent'
    /**
     * 专栏ID
     * 如：{@link https://www.bilibili.com/read/cv43496899/?jump_opus=1}
     * 43496899 就是专栏ID
     * API Docs {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/article/view.md#获取专栏正文内容}
     */
    id: string
  }

  /** 获取专栏显示卡片信息 */
  ArticleCardParams: {
    methodType: 'articleCards'
    /**
     * 被查询的 id 列表
     * 可传视频 **完整** AV/BV 号, 专栏 CV 号, 直播间长短 lv 号
     * API Docs {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/article/card.md#获取专栏显示卡片信息}
     */
    ids: string[] | string
  }

  /** 获取专栏文章基本信息 */
  ArticleInfoParams: {
    methodType: 'articleInfo'
    /**
     * 专栏ID
     * 如：{@link https://www.bilibili.com/read/cv43496899/?jump_opus=1}
     * 43496899 就是专栏ID
     * API Docs {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/article/view.md#获取专栏文章基本信息}
     */
    id: string
  }

  /** 获取文集基本信息 */
  ColumnInfoParams: {
    methodType: 'articleListInfo'
    /**
     * 文集rlid
     * 如：{@link https://www.bilibili.com/read/cv208340/?jump_opus=1}
     * 208340 就是文集rlid
     * API Docs {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/article/articles.md#获取文集基本信息}
     */
    id: string
  }

  /**
   * 获取实时弹幕
   * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/danmaku/danmaku_proto.md
   */
  DanmakuParams: {
    methodType: 'videoDanmaku'
    /** 稿件cid */
    cid: number
    /**
     * 分段序号（从1开始），每6分钟为一段
     * @defaultValue 1
     */
    segment_index?: number
  }

  /** 从 v_voucher 申请验证码 */
  ApplyVoucherCaptchaParams: {
    methodType: 'captchaFromVoucher'
    /** CSRF Token (位于 Cookie 的 bili_jct) */
    csrf?: string
    /** 结构为字符串 voucher_ 尾随一串以 - 为分隔符的小写 UUID */
    v_voucher: string
  }

  /** 验证验证码结果 */
  ValidateCaptchaParams: {
    methodType: 'validateCaptcha'
    /** CSRF Token (位于 Cookie 的 bili_jct) */
    csrf?: string
    /** 极验3 https://www.geetest.com 的验证码 challenge */
    challenge: string
    /** 验证码 token */
    token: string
    /** 人机验证成功后的 validate 参数 */
    validate: string
    /** 人机验证成功后的 seccode 参数，{validate}|jordan */
    seccode: string
  }
}

/**
 * 评论区类型枚举
 *
 * 对应 CommentParams.type 与 CommentReplyParams.type
 * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码
 */
export enum CommentType {
  /** 视频稿件：oid 为稿件 avid */
  Video = 1,
  /** 话题：oid 为话题 id */
  Topic = 2,
  /** 活动：oid 为活动 id */
  Activity = 4,
  /** 小视频：oid 为小视频 id */
  SmallVideo = 5,
  /** 小黑屋封禁信息：oid 为封禁公示 id */
  BlockInfo = 6,
  /** 公告信息：oid 为公告 id */
  Announcement = 7,
  /** 直播活动：oid 为直播间 id */
  LiveActivity = 8,
  /** 活动稿件：oid 含义未知 */
  ActivityVideo = 9,
  /** 直播公告：oid 含义未知 */
  LiveAnnouncement = 10,
  /** 相簿（图片动态）：oid 为相簿 id */
  Album = 11,
  /** 专栏：oid 为专栏 cvid */
  Article = 12,
  /** 票务：oid 含义未知 */
  Ticket = 13,
  /** 音频：oid 为音频 auid */
  Audio = 14,
  /** 风纪委员会：oid 为众裁项目 id */
  Jury = 15,
  /** 点评：oid 含义未知 */
  Review = 16,
  /** 动态（纯文字动态&分享）：oid 为动态 id */
  Dynamic = 17,
  /** 播单：oid 含义未知 */
  Playlist = 18,
  /** 音乐播单：oid 含义未知 */
  MusicPlaylist = 19,
  /** 漫画：oid 含义未知 */
  Comic1 = 20,
  /** 漫画：oid 含义未知 */
  Comic2 = 21,
  /** 漫画：oid 为漫画 mcid */
  Comic = 22,
  /** 课程：oid 为课程 epid */
  Course = 33
}

/**
 * B站方法类型到参数的映射
 *
 * 用于根据 methodType 字符串获取对应的参数类型
 */
export type BilibiliMethodOptMap = {
  videoInfo: BilibiliMethodOptionsMap['VideoInfoParams']
  videoStream: BilibiliMethodOptionsMap['VideoStreamParams']
  comments: BilibiliMethodOptionsMap['CommentParams']
  commentReplies: BilibiliMethodOptionsMap['CommentReplyParams']
  userCard: BilibiliMethodOptionsMap['UserParams']
  userDynamicList: BilibiliMethodOptionsMap['UserParams']
  userSpaceInfo: BilibiliMethodOptionsMap['UserParams']
  uploaderTotalViews: BilibiliMethodOptionsMap['UserParams']
  emojiList: BilibiliMethodOptionsMap['EmojiParams']
  bangumiInfo: BilibiliMethodOptionsMap['BangumiInfoParams']
  bangumiStream: BilibiliMethodOptionsMap['BangumiStreamParams']
  dynamicDetail: BilibiliMethodOptionsMap['DynamicParams']
  dynamicCard: BilibiliMethodOptionsMap['DynamicParams']
  liveRoomInfo: BilibiliMethodOptionsMap['LiveRoomParams']
  liveRoomInit: BilibiliMethodOptionsMap['LiveRoomParams']
  loginStatus: BilibiliMethodOptionsMap['LoginBaseInfoParams']
  loginQrcode: BilibiliMethodOptionsMap['GetQrcodeParams']
  qrcodeStatus: BilibiliMethodOptionsMap['QrcodeParams']
  avToBv: BilibiliMethodOptionsMap['Av2BvParams']
  bvToAv: BilibiliMethodOptionsMap['Bv2AvParams']
  articleContent: BilibiliMethodOptionsMap['ArticleParams']
  articleCards: BilibiliMethodOptionsMap['ArticleCardParams']
  articleInfo: BilibiliMethodOptionsMap['ArticleInfoParams']
  articleListInfo: BilibiliMethodOptionsMap['ColumnInfoParams']
  captchaFromVoucher: BilibiliMethodOptionsMap['ApplyVoucherCaptchaParams']
  validateCaptcha: BilibiliMethodOptionsMap['ValidateCaptchaParams']
  videoDanmaku: BilibiliMethodOptionsMap['DanmakuParams']
}
