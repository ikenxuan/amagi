import type { AppComments_V0 } from './AppComments_V0'

export type AppCommentsSuccess = AppComments_V0
export type AppCommentsError = never
export type AppComments = AppCommentsSuccess | AppCommentsError
