export type BiliUserFullView = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  archive: Archive
  article: Article
  likes: number;
  [property: string]: any
}

type Archive = {
  enable_vt: number
  view: number
  vt: number;
  [property: string]: any
}

type Article = {
  view: number;
  [property: string]: any
}
