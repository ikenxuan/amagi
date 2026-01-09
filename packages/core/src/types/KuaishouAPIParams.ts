import { KsEmojiList, KsOneWork, KsWorkComments } from 'amagi/types'

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
  emojiList: KuaishouMethodOptionsMap['EmojiListParams']
}
