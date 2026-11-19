import type { AppTextWork_V0 } from './AppTextWork_V0'

export type AppTextWorkSuccess = AppTextWork_V0
export type AppTextWorkError = never
export type AppTextWork = AppTextWorkSuccess | AppTextWorkError
