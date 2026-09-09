import type { CommentReplies_V0 } from './CommentReplies_V0'

export type CommentRepliesSuccess = CommentReplies_V0
export type CommentRepliesError = never
export type CommentReplies = CommentRepliesSuccess | CommentRepliesError
