import type { LiveRoomInfo_V0 } from './LiveRoomInfo_V0'

export type LiveRoomInfoSuccess = LiveRoomInfo_V0
export type LiveRoomInfoError = never
export type LiveRoomInfo = LiveRoomInfoSuccess | LiveRoomInfoError
