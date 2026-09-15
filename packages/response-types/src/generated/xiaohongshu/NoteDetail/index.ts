import type { NoteDetail_V0 } from './NoteDetail_V0'

export type NoteDetailSuccess = NoteDetail_V0
export type NoteDetailError = never
export type NoteDetail = NoteDetailSuccess | NoteDetailError
