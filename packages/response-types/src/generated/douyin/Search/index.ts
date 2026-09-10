import type { Search_V0 } from './Search_V0'
import type { Search_V1 } from './Search_V1'
import type { Search_V2 } from './Search_V2'

export type SearchSuccess = Search_V0 | Search_V1 | Search_V2
export type SearchError = never
export type Search = SearchSuccess | SearchError
