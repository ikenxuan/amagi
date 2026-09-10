import type { HomeFeed_V0 } from './HomeFeed_V0'

export type HomeFeedSuccess = HomeFeed_V0
export type HomeFeedError = never
export type HomeFeed = HomeFeedSuccess | HomeFeedError
