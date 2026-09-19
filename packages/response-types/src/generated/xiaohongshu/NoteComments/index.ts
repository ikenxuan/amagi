import type { NoteComments_V0 } from './NoteComments_V0'

export type NoteCommentsSuccess = NoteComments_V0
export type NoteCommentsError = never
export type NoteComments = NoteCommentsSuccess | NoteCommentsError
