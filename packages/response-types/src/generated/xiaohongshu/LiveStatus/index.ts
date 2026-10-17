import type { LiveStatus_V0 } from './LiveStatus_V0'

export type LiveStatusSuccess = LiveStatus_V0
export type LiveStatusError = never
export type LiveStatus = LiveStatusSuccess | LiveStatusError
