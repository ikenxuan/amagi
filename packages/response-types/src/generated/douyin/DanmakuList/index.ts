import type { DanmakuList_V0 } from './DanmakuList_V0'

export type DanmakuListSuccess = DanmakuList_V0
export type DanmakuListError = never
export type DanmakuList = DanmakuListSuccess | DanmakuListError
