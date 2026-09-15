// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/articleContent.requests.json 里
//   id
//   id  变体0

export type ArticleContent_V0 = {
  code: number
  data?: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  act_id: number
  apply_time: string
  authenMark: null
  author: Author
  banner_url: string
  categories: Category[]
  category: Category
  check_state: number
  check_time: string
  content: string
  content_pic_list: null
  cover_avid: number
  ctime: number
  dispute: null
  dyn_id_str: string
  id: number
  image_urls: string[]
  is_like: boolean
  keywords: string
  list: List
  media: Media
  mtime: number
  opus: Opus
  origin_image_urls: string[]
  origin_template_id: number
  original: number
  private_pub: number
  publish_time: number
  reprint: number
  state: number
  stats: Stats
  summary: string
  tags: Tag3[]
  template_id: number
  title: string
  top_video_info: null
  total_art_num: number
  type: number
  version_id: number
  words: number
  [property: string]: any
}

type Author = {
  face: string
  fans: number
  level: number
  mid: number
  name: string
  nameplate: Nameplate
  official_verify: OfficialVerify
  pendant: Pendant
  vip: Vip
  [property: string]: any
}

type Nameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number
  [property: string]: any
}

type OfficialVerify = {
  desc: string
  type: number
  [property: string]: any
}

type Pendant = {
  expire: number
  image: string
  name: string
  pid: number
  [property: string]: any
}

type Vip = {
  avatar_subscript: number
  due_date: number
  label: Label
  nickname_color: string
  status: number
  theme_type: number
  type: number
  vip_pay_type: number
  [property: string]: any
}

type Label = {
  label_theme: string
  path: string
  text: string
  [property: string]: any
}

type Category = {
  id: number
  name: string
  parent_id: number
  [property: string]: any
}

type List = {
  apply_time: string
  articles_count: number
  check_time: string
  ctime: number
  id: number
  image_url: string
  mid: number
  name: string
  publish_time: number
  read: number
  reason: string
  state: number
  summary: string
  update_time: number
  words: number
  [property: string]: any
}

type Media = {
  area: string
  cover: string
  media_id: number
  score: number
  season_id: number
  spoiler: number
  title: string
  type_id: number
  type_name: string
  [property: string]: any
}

type Opus = {
  article: Article
  content: Content
  opus_id: number
  opus_source: number
  pub_info: PubInfo
  tags: Tag[]
  title: string
  translate_result: TranslateResult
  version: Version
  [property: string]: any
}

type Article = {
  biz_tags: string[]
  category_id: number
  cover: Cover[]
  list_id: number
  originality: number
  reproduced: number
  [property: string]: any
}

type Cover = {
  height: number
  size: number
  url: string
  width: number
  [property: string]: any
}

type Content = {
  paragraphs: Paragraph[]
  [property: string]: any
}

type Paragraph = {
  format?: Format
  para_type: number
  pic?: Pic
  text?: Text
  [property: string]: any
}

type Format = {
  list_format: ListFormat
  [property: string]: any
}

type ListFormat = {
  level: number
  order: number
  [property: string]: any
}

type Pic = {
  pics: Cover[]
  style: number
  [property: string]: any
}

type Text = {
  nodes: Node[]
  [property: string]: any
}

type Node = {
  node_type: number
  word: Word
  [property: string]: any
}

type Word = {
  font_level: string
  font_size: number
  style: Style
  words: string
  [property: string]: any
}

type Style = {
  bold?: boolean
  [property: string]: any
}

type PubInfo = {
  pub_time: number
  uid: number
  [property: string]: any
}

type Tag = {
  tag: Tag2
  [property: string]: any
}

type Tag2 = {
  link_type: number
  show_text: string
  [property: string]: any
}

type TranslateResult = {
  lang_match_result: number
  state: number
  [property: string]: any
}

type Version = {
  cvid: number
  version_id: number
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

type Tag3 = {
  name: string
  tid: number
  [property: string]: any
}
