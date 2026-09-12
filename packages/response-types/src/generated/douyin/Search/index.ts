import type { SearchUnion } from './guards'

export type SearchSuccess = SearchUnion
export type SearchError = never
export type Search = SearchSuccess | SearchError
