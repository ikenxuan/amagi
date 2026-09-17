import type { LoginStatus_V0 } from './LoginStatus_V0'

export type LoginStatusSuccess = LoginStatus_V0
export type LoginStatusError = never
export type LoginStatus = LoginStatusSuccess | LoginStatusError
