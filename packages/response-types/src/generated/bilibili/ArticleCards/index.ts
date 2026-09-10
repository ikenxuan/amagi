import type { ArticleCards_V0 } from './ArticleCards_V0'

export type ArticleCardsSuccess = ArticleCards_V0
export type ArticleCardsError = never
export type ArticleCards = ArticleCardsSuccess | ArticleCardsError
