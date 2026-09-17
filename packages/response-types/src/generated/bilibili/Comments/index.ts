import type { Comments_V0 } from './Comments_V0'

export type CommentsSuccess = Comments_V0
export type CommentsError = never
export type Comments = CommentsSuccess | CommentsError
