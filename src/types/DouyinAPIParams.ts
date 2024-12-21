export interface DouyinAPIOptionsMap {
  CommentReplyParams: {
    /** 视频ID */
    aweme_id: string
    /** 评论ID */
    comment_id: string
  },
  UserParams: {
    /** 用户ID */
    sec_uid: string
  },
  WorkParams: {
    /** 视频分享URL */
    url?: string
    /** 视频ID，数据获取更准确，和url二选一 */
    aweme_id?: string
    /** 获取的评论数量 */
    number?: number
  },
  CommentParams: {
    /** 视频分享URL，和aweme_id二选一 */
    url?: string
    /** 视频ID，数据获取更准确，和url二选一 */
    aweme_id?: string
    /**
     * 获取的评论数量
     * @default 0
     */
    number?: number
    /** 游标 */
    cursor?: number
  },
  MusicParams: {
    /** 音乐ID */
    music_id: string
  },
  LiveWorkParams: {
    /** 视频分享URL，和aweme_id二选一 */
    url?: string
    /** 视频ID，，数据获取更准确，和url二选一 */
    aweme_id?: string
  },
  LiveRoomParams: {
    /** 直播间ID，可从用户主页信息的room_id_str值取得 */
    room_id: string
    /** 直播间真实房间号（可通过live.douyin.com/{web_rid}直接访问直播间），在用户主页信息的room_data中获取 */
    web_rid?: string
  },
  QrcodeParams: {
    /** fp指纹 */
    verify_fp: string
  },
  SearchParams: {
    /** 搜索词 */
    query: string
  }
}
export interface DouyinDataOptionsMap {
  二级评论数据: DouyinAPIOptionsMap['CommentReplyParams'],
  用户主页数据: DouyinAPIOptionsMap['UserParams'],
  单个视频作品数据: DouyinAPIOptionsMap['WorkParams'],
  评论数据: DouyinAPIOptionsMap['CommentParams'],
  用户主页视频列表数据: DouyinAPIOptionsMap['UserParams'],
  热点词数据: DouyinAPIOptionsMap['SearchParams'],
  搜索数据: DouyinAPIOptionsMap['SearchParams'],
  Emoji数据: any,
  动态表情数据: any,
  音乐数据: DouyinAPIOptionsMap['MusicParams'],
  图集作品数据: DouyinAPIOptionsMap['WorkParams'],
  实况图片图集数据: DouyinAPIOptionsMap['LiveWorkParams'],
  直播间信息数据: DouyinAPIOptionsMap['UserParams'],
  申请二维码数据: DouyinAPIOptionsMap['QrcodeParams']
}
