import type { UserNoteList_V0 } from './UserNoteList_V0'

export type UserNoteListSuccess = UserNoteList_V0
export type UserNoteListError = never
export type UserNoteList = UserNoteListSuccess | UserNoteListError
