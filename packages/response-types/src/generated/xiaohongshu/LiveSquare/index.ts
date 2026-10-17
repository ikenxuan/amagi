import type { LiveSquare_V0 } from './LiveSquare_V0'

export type LiveSquareSuccess = LiveSquare_V0
export type LiveSquareError = never
export type LiveSquare = LiveSquareSuccess | LiveSquareError
