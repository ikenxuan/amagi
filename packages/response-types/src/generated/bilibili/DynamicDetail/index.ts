import type { DynamicDetailUnion } from './guards'

export type DynamicDetailSuccess = DynamicDetailUnion
export type DynamicDetailError = never
export type DynamicDetail = DynamicDetailSuccess | DynamicDetailError
