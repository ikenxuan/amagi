import type { SubComments_V0 } from './SubComments_V0'

export type SubCommentsSuccess = SubComments_V0
export type SubCommentsError = never
export type SubComments = SubCommentsSuccess | SubCommentsError
