import type { UserCard_V0 } from './UserCard_V0'

export type UserCardSuccess = UserCard_V0
export type UserCardError = never
export type UserCard = UserCardSuccess | UserCardError
