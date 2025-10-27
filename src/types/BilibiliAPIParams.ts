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
    /**
     * 当获取第一页评论时存在
     */
    seek_rpid?: string
    /**
     * web位置参数
     * @defaultValue 1315875
     */
    web_location?: string
  },
  UserParams: {
    methodType: '用户主页数据' | '用户主页动态列表数据' | '获取UP主总播放量'
    /** UP主UID */
    host_mid: number
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
  ArticleParams: {
    methodType: '专栏正文内容'
    /** 
     * 专栏ID
     * * 如：{@link https://www.bilibili.com/read/cv43496899/?jump_opus=1}
     * * 43496899 就是专栏ID
     * * API Docs {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/article/view.md#获取专栏正文内容}
     */
    id: string
  },
  ArticleCardParams: {
    methodType: '专栏显示卡片信息'
    /** 
     * 被查询的 id 列表
     * 可传视频 **完整** AV/BV 号, 专栏 CV 号, 直播间长短 lv 号
     * * API Docs {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/article/card.md#获取专栏显示卡片信息}
     */
    ids: string[]
  },
  ArticleInfoParams: {
    methodType: '专栏文章基本信息'
    /** 
     * 专栏ID
     * * 如：{@link https://www.bilibili.com/read/cv43496899/?jump_opus=1}
     * * 43496899 就是专栏ID
     * * API Docs {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/article/view.md#获取专栏文章基本信息}
     */
    id: string
  }
  ColumnInfoParams: {
    methodType: '文集基本信息'
    /** 
     * 文集rlid，这个好像也是专栏ID
     * * 如：{@link https://www.bilibili.com/read/cv208340/?jump_opus=1}
     * * 208340 就是文集rlid
     * * API Docs {@link https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/article/articles.md#获取文集基本信息}
     */
    id: string
  }
}