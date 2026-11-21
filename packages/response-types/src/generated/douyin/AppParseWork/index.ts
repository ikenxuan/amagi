import type { AppParseWork_V0 } from './AppParseWork_V0'

export type AppParseWorkSuccess = AppParseWork_V0
export type AppParseWorkError = never
export type AppParseWork = AppParseWorkSuccess | AppParseWorkError
