import type { AppFeed_V0 } from './AppFeed_V0'

export type AppFeedSuccess = AppFeed_V0
export type AppFeedError = never
export type AppFeed = AppFeedSuccess | AppFeedError
