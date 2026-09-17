// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/articleInfo.requests.json 里
//   id  变体0

export type ArticleInfo_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
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
  video_url: string
  [property: string]: any
}

type ShareChannel = {
  name: string
  picture: string
  share_channel: string
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
  view: number
  [property: string]: any
}
