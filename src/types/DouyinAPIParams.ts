import {
  DyEmojiList,
  DyEmojiProList,
  DyImageAlbumWork,
  DyMusicWork,
  DySearchInfo,
  DySlidesWork,
  DySuggestWords,
  DyUserInfo,
  DyUserLiveVideos,
  DyUserPostVideos,
  DyVideoWork,
  DyWorkComments
} from 'amagi/types'

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
    methodType: '用户主页数据' | '用户主页视频列表数据' | '直播间信息数据'
    /** 用户ID */
    sec_uid: string
  },
  WorkParams: {
    methodType: '视频作品数据' | '图集作品数据' | '合辑作品数据' | '聚合解析'
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
    /** 直播间ID，可从用户主页信息的room_id_str值取得 */
    room_id: string
    /** 直播间真实房间号（可通过live.douyin.com/\{web_rid\}直接访问直播间），在用户主页信息的room_data中获取 */
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

/** 抖音API接口参数类型 */
export interface DouyinDataOptionsMap {
  聚合解析: { opt: DouyinMethodOptionsMap['WorkParams'], data: DyVideoWork | DyImageAlbumWork | DySlidesWork },
  视频作品数据: { opt: DouyinMethodOptionsMap['VideoWorkParams'], data: DyVideoWork },
  图集作品数据: { opt: DouyinMethodOptionsMap['ImageAlbumWorkParams'], data: DyImageAlbumWork },
  合辑作品数据: { opt: DouyinMethodOptionsMap['SlidesWorkParams'], data: DySlidesWork },
  评论数据: { opt: DouyinMethodOptionsMap['CommentParams'], data: DyWorkComments },
  用户主页数据: { opt: DouyinMethodOptionsMap['UserParams'], data: DyUserInfo },
  用户主页视频列表数据: { opt: DouyinMethodOptionsMap['UserParams'], data: DyUserPostVideos },
  热点词数据: { opt: DouyinMethodOptionsMap['SearchParams'], data: DySuggestWords },
  搜索数据: { opt: DouyinMethodOptionsMap['SearchParams'], data: DySearchInfo },
  Emoji数据: { opt: DouyinMethodOptionsMap['EmojiListParams'], data: DyEmojiList },
  动态表情数据: { opt: DouyinMethodOptionsMap['EmojiProParams'], data: DyEmojiProList },
  音乐数据: { opt: DouyinMethodOptionsMap['MusicParams'], data: DyMusicWork },
  直播间信息数据: { opt: DouyinMethodOptionsMap['UserParams'], data: DyUserLiveVideos },
  申请二维码数据: { opt: DouyinMethodOptionsMap['QrcodeParams'], data: any },
  指定评论回复数据: { opt: DouyinMethodOptionsMap['CommentReplyParams'], data: any },
}
