import type { SearchHotList_V0 } from './SearchHotList_V0'

export type SearchHotListSuccess = SearchHotList_V0
export type SearchHotListError = never
export type SearchHotList = SearchHotListSuccess | SearchHotListError
