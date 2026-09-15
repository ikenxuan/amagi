import type { BangumiStream_V0 } from './BangumiStream_V0'

export type BangumiStreamSuccess = BangumiStream_V0
export type BangumiStreamError = never
export type BangumiStream = BangumiStreamSuccess | BangumiStreamError
