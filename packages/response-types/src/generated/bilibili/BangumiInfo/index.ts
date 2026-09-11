import type { BangumiInfo_V0 } from './BangumiInfo_V0'

export type BangumiInfoSuccess = BangumiInfo_V0
export type BangumiInfoError = never
export type BangumiInfo = BangumiInfoSuccess | BangumiInfoError
