import type { UserLiveStatus_V0 } from './UserLiveStatus_V0'

export type UserLiveStatusSuccess = UserLiveStatus_V0
export type UserLiveStatusError = never
export type UserLiveStatus = UserLiveStatusSuccess | UserLiveStatusError
