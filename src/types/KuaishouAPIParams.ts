export interface KuaishouAPIOptionsMap {
  VideoInfoParams: {
    /** 作品ID */
    photoId: string
  },
  CommentParams: {
    /** 作品ID */
    photoId?: string
  },
}

/** 快手API接口参数类型 */
export interface KuaishouDataOptionsMap {
  单个视频作品数据: KuaishouAPIOptionsMap['VideoInfoParams'],
  评论数据: KuaishouAPIOptionsMap['CommentParams'],
  Emoji数据: any,
}
