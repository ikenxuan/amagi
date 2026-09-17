import type { EmojiList_V0 } from './EmojiList_V0'

export type EmojiListSuccess = EmojiList_V0
export type EmojiListError = never
export type EmojiList = EmojiListSuccess | EmojiListError
