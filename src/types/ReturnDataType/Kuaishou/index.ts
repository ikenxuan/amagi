import type { KsEmojiList } from './EmojiList'
import type { KsOneWork } from './OneWork'
import type { KsWorkComments } from './WorkComments'

export * from './EmojiList'
export * from './OneWork'
export * from './WorkComments'

export interface KuaishouReturnTypeMap {
  单个视频作品数据: KsOneWork
  评论数据: KsWorkComments
  Emoji数据: KsEmojiList
}
