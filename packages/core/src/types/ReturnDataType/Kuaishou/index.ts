import type { KsEmojiList } from './EmojiList'
import type { KsOneWork } from './OneWork'
import type { KsWorkComments } from './WorkComments'

export * from './EmojiList'
export * from './OneWork'
export * from './WorkComments'

/**
 * 快手返回类型映射
 */
export interface KuaishouReturnTypeMap {
  videoWork: KsOneWork
  comments: KsWorkComments
  emojiList: KsEmojiList
}
