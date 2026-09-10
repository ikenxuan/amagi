import type { DynamicDetail_V0 } from './DynamicDetail_V0'
import type { DynamicDetail_V1 } from './DynamicDetail_V1'
import type { DynamicDetail_V2 } from './DynamicDetail_V2'

export type DynamicDetailSuccess = DynamicDetail_V0 | DynamicDetail_V1 | DynamicDetail_V2
export type DynamicDetailError = never
export type DynamicDetail = DynamicDetailSuccess | DynamicDetailError
