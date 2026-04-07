/**
 * 快手 API 方法参数映射
 */
export interface KuaishouMethodOptionsMap {
  VideoInfoParams: {
    methodType: 'videoWork'
    /** 作品ID */
    photoId: string
  },
  CommentParams: {
    methodType: 'comments'
    /** 作品ID */
    photoId: string
  },
  UserProfileParams: {
    methodType: 'userProfile'
    /** 用户主页 principalId，可直接取 profile 页 URL 末段 */
    principalId: string
  },
  UserWorkListParams: {
    methodType: 'userWorkList'
    /** 用户主页 principalId，可直接取 profile 页 URL 末段 */
    principalId: string
    /** 分页游标；为空时请求首屏作品列表 */
    pcursor?: string
    /** 每页数量，默认 12 */
    count?: number
  },
  LiveRoomInfoParams: {
    methodType: 'liveRoomInfo'
    /** 直播间 principalId，可直接取 /u/{principalId} URL 末段 */
    principalId: string
  },
  EmojiListParams: {
    methodType: 'emojiList'
  }
}

/**
 * 快手方法类型到参数的映射
 */
export type KuaishouMethodOptMap = {
  videoWork: KuaishouMethodOptionsMap['VideoInfoParams']
  comments: KuaishouMethodOptionsMap['CommentParams']
  userProfile: KuaishouMethodOptionsMap['UserProfileParams']
  userWorkList: KuaishouMethodOptionsMap['UserWorkListParams']
  liveRoomInfo: KuaishouMethodOptionsMap['LiveRoomInfoParams']
  emojiList: KuaishouMethodOptionsMap['EmojiListParams']
}
