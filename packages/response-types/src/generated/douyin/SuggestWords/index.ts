import type { SuggestWords_V0 } from './SuggestWords_V0'

export type SuggestWordsSuccess = SuggestWords_V0
export type SuggestWordsError = never
export type SuggestWords = SuggestWordsSuccess | SuggestWordsError
