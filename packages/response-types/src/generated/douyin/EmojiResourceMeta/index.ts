import type { EmojiResourceMeta_V0 } from './EmojiResourceMeta_V0'

export type EmojiResourceMetaSuccess = EmojiResourceMeta_V0
export type EmojiResourceMetaError = never
export type EmojiResourceMeta = EmojiResourceMetaSuccess | EmojiResourceMetaError
