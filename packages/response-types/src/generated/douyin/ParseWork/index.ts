import type { ParseWork_Error_V0 } from './ParseWork_Error_V0'
import type { ParseWork_V0 } from './ParseWork_V0'

export type ParseWorkSuccess = ParseWork_V0
export type ParseWorkError = ParseWork_Error_V0
export type ParseWork = ParseWorkSuccess | ParseWorkError
