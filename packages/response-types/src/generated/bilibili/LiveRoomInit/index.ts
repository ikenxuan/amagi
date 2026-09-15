import type { LiveRoomInit_V0 } from './LiveRoomInit_V0'

export type LiveRoomInitSuccess = LiveRoomInit_V0
export type LiveRoomInitError = never
export type LiveRoomInit = LiveRoomInitSuccess | LiveRoomInitError
