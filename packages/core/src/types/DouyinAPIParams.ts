/**
 * 抖音 API 参数类型定义
 *
 * 定义所有抖音 API 方法的参数接口和类型映射
 *
 * @module types/DouyinAPIParams
 */

/**
 * 抖音 API 方法参数映射接口
 *
 * 每个键对应一种 API 方法，值为该方法所需的参数接口
 */
export interface DouyinMethodOptionsMap {
  /** 获取指定评论的回复 */
  CommentReplyParams: {
    methodType: 'commentReplies'
    /** 视频ID */
    aweme_id: string
    /** 评论ID */
    comment_id: string
    /**
     * 获取的评论数量
     * 默认情况下，如果指定的数量不足，则获取实际的评论数量。
     * @defaultValue 5
     */
    number?: number
    /**
     * 游标，作用类似于翻页，根据上一次评论数量递增
     * @defaultValue 0
     */
    cursor?: number
  }

  /** 获取用户相关数据 */
  UserParams: {
    methodType: 'userProfile'
    /** 用户ID */
    sec_uid: string
  }

  /** 获取用户列表数据（视频列表、喜欢列表、推荐列表） */
  UserListParams: {
    methodType: 'userVideoList' | 'userFavoriteList' | 'userRecommendList'
    /** 用户ID */
    sec_uid: string
    /**
     * 获取的数量
     * @defaultValue 18
     */
    number?: number
    /** 游标，用于获取下一页，不用填。 */
    max_cursor?: string
  }

  /** 获取作品数据 */
  WorkParams: {
    methodType: 'videoWork' | 'imageAlbumWork' | 'slidesWork' | 'parseWork' | 'textWork'
    /** 视频ID、图集ID、合辑ID */
    aweme_id: string
  }

  /** 获取评论数据 */
  CommentParams: {
    methodType: 'comments'
    /** 视频ID */
    aweme_id: string
    /**
     * 获取的评论数量
     * 默认情况下，如果指定的数量不足，则获取实际的评论数量。
     * @defaultValue 50
     */
    number?: number
    /**
     * 游标，作用类似于翻页，根据上一次评论数量递增
     * @defaultValue 0
     */
    cursor?: number
  }

  /** 获取音乐数据 */
  MusicParams: {
    methodType: 'musicInfo'
    /** 音乐ID */
    music_id: string
  }

  /** 获取直播间信息 */
  LiveRoomParams: {
    methodType: 'liveRoomInfo'
    /** 直播间ID，可从用户主页信息信息响应中的room_id_str值取得 */
    room_id: string
    /** 直播间真实房间号（可通过live.douyin.com/{web_rid}直接访问直播间），可在在用户主页信息响应中的room_data中获取 */
    web_rid: string
  }

  /** 申请登录二维码 */
  QrcodeParams: {
    methodType: 'loginQrcode'
    /** fp指纹 */
    verify_fp: string
  }

  /** 获取热点词数据 */
  HotWordsParams: {
    methodType: 'suggestWords'
    /** 搜索词 */
    query: string
  }

  /** 搜索数据 */
  SearchParams: {
    methodType: 'search'
    /** 搜索词 */
    query: string
    /**
     * 搜索类型
     * @default 'general'
     */
    type?: 'general' | 'user' | 'video'
    /**
     * 搜索数量
     * @default 10
     */
    number?: number
    /** 上次搜索的游标值 */
    search_id?: string
  }

  /** 获取表情列表 */
  EmojiListParams: {
    methodType: 'emojiList'
  }

  /** 获取动态表情数据 */
  EmojiProParams: {
    methodType: 'dynamicEmojiList'
  }

  /** 获取弹幕数据 */
  DanmakuParams: {
    methodType: 'danmakuList'
    /** 视频ID */
    aweme_id: string
    /**
     * 弹幕查询的开始时间（毫秒）
     * 例如：设置为5000表示从视频第5秒开始获取弹幕
     * 不设置则从视频开头（0秒）开始获取
     * @default 0
     */
    start_time?: number
    /**
     * 弹幕查询的结束时间（毫秒）
     * 例如：设置为10000表示获取到视频第10秒的弹幕
     * 不设置则获取到视频结束
     */
    end_time?: number
    /** 视频总时长 */
    duration: number
  }

  /** 获取视频作品数据 */
  VideoWorkParams: {
    methodType: 'videoWork'
    /** 视频ID */
    aweme_id: string
  }

  /** 获取图集作品数据 */
  ImageAlbumWorkParams: {
    methodType: 'imageAlbumWork'
    /** 图集ID */
    aweme_id: string
  }

  /** 获取合辑作品数据 */
  SlidesWorkParams: {
    methodType: 'slidesWork'
    /** 合辑ID */
    aweme_id: string
  }
}

/**
 * 抖音方法类型到参数的映射
 *
 * 用于根据 methodType 字符串获取对应的参数类型
 */
export type DouyinMethodOptMap = {
  textWork: DouyinMethodOptionsMap['WorkParams']
  videoWork: DouyinMethodOptionsMap['WorkParams']
  imageAlbumWork: DouyinMethodOptionsMap['WorkParams']
  slidesWork: DouyinMethodOptionsMap['WorkParams']
  parseWork: DouyinMethodOptionsMap['WorkParams']
  comments: DouyinMethodOptionsMap['CommentParams']
  userProfile: DouyinMethodOptionsMap['UserParams']
  userVideoList: DouyinMethodOptionsMap['UserListParams']
  userFavoriteList: DouyinMethodOptionsMap['UserListParams']
  userRecommendList: DouyinMethodOptionsMap['UserListParams']
  suggestWords: DouyinMethodOptionsMap['HotWordsParams']
  search: DouyinMethodOptionsMap['SearchParams']
  musicInfo: DouyinMethodOptionsMap['MusicParams']
  liveRoomInfo: DouyinMethodOptionsMap['LiveRoomParams']
  loginQrcode: DouyinMethodOptionsMap['QrcodeParams']
  emojiList: DouyinMethodOptionsMap['EmojiListParams']
  dynamicEmojiList: DouyinMethodOptionsMap['EmojiProParams']
  commentReplies: DouyinMethodOptionsMap['CommentReplyParams']
  danmakuList: DouyinMethodOptionsMap['DanmakuParams']
}
