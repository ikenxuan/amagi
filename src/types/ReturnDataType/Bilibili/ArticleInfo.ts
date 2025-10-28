export type ArticleInfo = {
  code: number
  data: DataData
  message: string
  ttl: number;
  [property: string]: any
}

type DataData = {
  attention: boolean
  author_name: string
  banner_url: string
  coin: number
  disable_share: boolean
  favorite: boolean
  image_urls: string[]
  in_list: boolean
  is_author: boolean
  like: number
  location: string
  mid: number
  next: number
  origin_image_urls: string[]
  pre: number
  share_channels: ShareChannel[]
  shareable: boolean
  show_later_watch: boolean
  show_small_window: boolean
  stats: Stats
  title: string
  type: number
  video_url: string;
  [property: string]: any
}

type ShareChannel = {
  name: string
  picture: string
  share_channel: string;
  [property: string]: any
}

type Stats = {
  coin: number
  dislike: number
  dynamic: number
  favorite: number
  like: number
  reply: number
  share: number
  view: number;
  [property: string]: any
}