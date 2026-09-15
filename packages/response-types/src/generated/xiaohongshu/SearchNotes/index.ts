import type { SearchNotes_V0 } from './SearchNotes_V0'

export type SearchNotesSuccess = SearchNotes_V0
export type SearchNotesError = never
export type SearchNotes = SearchNotesSuccess | SearchNotesError
