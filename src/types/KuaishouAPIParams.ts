export interface KuaishouMethodOptionsMap {
  VideoInfoParams: {
    methodType: '单个视频作品数据'
    /** 作品ID */
    photoId: string
  },
  CommentParams: {
    methodType: '评论数据'
    /** 作品ID */
    photoId?: string
  },
  EmojiListParams: {
    methodType: 'Emoji数据'
  }
}

/** 快手API接口参数类型 */
export interface KuaishouDataOptionsMap {
  单个视频作品数据: KuaishouMethodOptionsMap['VideoInfoParams'],
  评论数据: KuaishouMethodOptionsMap['CommentParams'],
  Emoji数据: KuaishouMethodOptionsMap['EmojiListParams'],
}
