import type { SearchUser_V0 } from './SearchUser_V0'

export type SearchUserSuccess = SearchUser_V0
export type SearchUserError = never
export type SearchUser = SearchUserSuccess | SearchUserError
