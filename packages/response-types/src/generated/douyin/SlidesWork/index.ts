import type { SlidesWork_Error_V0 } from './SlidesWork_Error_V0'
import type { SlidesWork_V0 } from './SlidesWork_V0'
import type { SlidesWork_V1 } from './SlidesWork_V1'

export type SlidesWorkSuccess = SlidesWork_V0 | SlidesWork_V1
export type SlidesWorkError = SlidesWork_Error_V0
export type SlidesWork = SlidesWorkSuccess | SlidesWorkError
