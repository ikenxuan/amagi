import type { LiveRoom_V0 } from './LiveRoom_V0'

export type LiveRoomSuccess = LiveRoom_V0
export type LiveRoomError = never
export type LiveRoom = LiveRoomSuccess | LiveRoomError
