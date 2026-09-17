import type { TextWork_V0 } from './TextWork_V0'

export type TextWorkSuccess = TextWork_V0
export type TextWorkError = never
export type TextWork = TextWorkSuccess | TextWorkError
