export interface DouyinMethodOptionsMap {
  CommentReplyParams: {
    methodType: '指定评论回复数据'
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
  },
  UserParams: {
    methodType: '用户主页数据' | '用户主页视频列表数据'
    /** 用户ID */
    sec_uid: string
  },
  WorkParams: {
    methodType: '视频作品数据' | '图集作品数据' | '合辑作品数据' | '聚合解析' | '文字作品数据'
    /** 视频ID、图集ID、合辑ID */
    aweme_id: string
  },
  CommentParams: {
    methodType: '评论数据'
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
  },
  MusicParams: {
    methodType: '音乐数据'
    /** 音乐ID */
    music_id: string
  },
  LiveRoomParams: {
    methodType: '直播间信息数据'
    /** 直播间ID，可从用户主页信息信息响应中的room_id_str值取得 */
    room_id: string
    /** 直播间真实房间号（可通过live.douyin.com/{web_rid}直接访问直播间），可在在用户主页信息响应中的room_data中获取 */
    web_rid: string
  },
  QrcodeParams: {
    methodType: '申请二维码数据'
    /** fp指纹 */
    verify_fp: string
  },
  SearchParams: {
    methodType: '热点词数据' | '搜索数据'
    /** 搜索词 */
    query: string
    /**
     * 搜索数量，仅数据类型为"搜索数据"时有效
     * @defaultValue 10
     */
    number?: number
    /** 上次搜索的游标值 */
    search_id?: string
  }
  EmojiListParams: {
    methodType: 'Emoji数据'
  },
  EmojiProParams: {
    methodType: '动态表情数据'
  },
  DanmakuParams: {
    methodType: '弹幕数据'
    /** 视频ID */
    aweme_id: string
    /**
     * 弹幕查询的开始时间（毫秒）
     * 例如：设置为5000表示从视频第5秒开始获取弹幕
     * 不设置则从视频开头（0秒）开始获取
     * @default 0
     */
    start_time?: number,
    /**
     * 弹幕查询的结束时间（毫秒）
     * 例如：设置为10000表示获取到视频第10秒的弹幕
     * 不设置则获取到视频结束
     */
    end_time?: number,
    /** 视频总时长 */
    duration: number
  },
  VideoWorkParams: {
    methodType: '视频作品数据'
    /** 视频ID */
    aweme_id: string
  },
  ImageAlbumWorkParams: {
    methodType: '图集作品数据'
    /** 图集ID */
    aweme_id: string
  },
  SlidesWorkParams: {
    methodType: '合辑作品数据'
    /** 合辑ID */
    aweme_id: string
  }
}

export type DouyinMethodOptMap = {
  文字作品数据: DouyinMethodOptionsMap['WorkParams']
  视频作品数据: DouyinMethodOptionsMap['WorkParams']
  图集作品数据: DouyinMethodOptionsMap['WorkParams']
  合辑作品数据: DouyinMethodOptionsMap['WorkParams']
  聚合解析: DouyinMethodOptionsMap['WorkParams']
  评论数据: DouyinMethodOptionsMap['CommentParams']
  用户主页数据: DouyinMethodOptionsMap['UserParams']
  用户主页视频列表数据: DouyinMethodOptionsMap['UserParams']
  热点词数据: DouyinMethodOptionsMap['SearchParams']
  搜索数据: DouyinMethodOptionsMap['SearchParams']
  音乐数据: DouyinMethodOptionsMap['MusicParams']
  直播间信息数据: DouyinMethodOptionsMap['LiveRoomParams']
  申请二维码数据: DouyinMethodOptionsMap['QrcodeParams']
  Emoji数据: DouyinMethodOptionsMap['EmojiListParams']
  动态表情数据: DouyinMethodOptionsMap['EmojiProParams']
  指定评论回复数据: DouyinMethodOptionsMap['CommentReplyParams']
  弹幕数据: DouyinMethodOptionsMap['DanmakuParams']
}
