import type { VideoDanmaku_V0 } from './VideoDanmaku_V0'

export type VideoDanmakuSuccess = VideoDanmaku_V0
export type VideoDanmakuError = never
export type VideoDanmaku = VideoDanmakuSuccess | VideoDanmakuError
