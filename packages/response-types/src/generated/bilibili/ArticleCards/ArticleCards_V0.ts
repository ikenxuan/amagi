// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/articleCards.requests.json 里
//   ids  变体0

export type ArticleCards_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  av2: Av2
  cv1: Cv1
  cv2: Cv2
  lv5440: Lv5440
  [property: string]: any
}

type Av2 = {
  aid: number
  bvid: string
  cid: number
  copyright: number
  cover43: string
  ctime: number
  desc: string
  dimension: Dimension
  duration: number
  dynamic: string
  owner: Owner
  pic: string
  pubdate: number
  rights: Rights
  short_link_v2: string
  stat: Stat
  state: number
  tid: number
  title: string
  tname: string
  videos: number
  vt_switch: boolean
  [property: string]: any
}

type Dimension = {
  height: number
  rotate: number
  width: number
  [property: string]: any
}

type Owner = {
  face: string
  mid: number
  name: string
  [property: string]: any
}

type Rights = {
  arc_pay: number
  autoplay: number
  bp: number
  download: number
  elec: number
  hd5: number
  is_cooperation: number
  movie: number
  no_background: number
  no_reprint: number
  pay: number
  pay_free_watch: number
  ugc_pay: number
  ugc_pay_preview: number
  [property: string]: any
}

type Stat = {
  aid: number
  coin: number
  danmaku: number
  dislike: number
  favorite: number
  his_rank: number
  like: number
  now_rank: number
  reply: number
  share: number
  view: number
  vt: number
  vv: number
  [property: string]: any
}

type Cv1 = {
  act_id: number
  apply_time: string
  attributes: number
  authenMark: null
  author: Author
  banner_url: string
  categories: Category[]
  category: Category
  check_state: number
  check_time: string
  content_pic_list: null
  cover_avid: number
  ctime: number
  dispute: null
  dynamic: string
  id: number
  image_urls: string[]
  is_like: boolean
  list: List
  media: Media
  mtime: number
  origin_image_urls: string[]
  origin_template_id: number
  original: number
  private_pub: number
  publish_time: number
  reprint: number
  state: number
  stats: Stats
  summary: string
  template_id: number
  title: string
  top_video_info: null
  type: number
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

type Cv2 = {
  act_id: number
  apply_time: string
  authenMark: null
  author: Author
  banner_url: string
  categories: Category[]
  category: Category
  check_state: number
  check_time: string
  content_pic_list: null
  cover_avid: number
  ctime: number
  dispute: null
  id: number
  image_urls: string[]
  is_like: boolean
  list: null
  media: Media
  mtime: number
  origin_image_urls: string[]
  origin_template_id: number
  original: number
  private_pub: number
  publish_time: number
  reprint: number
  state: number
  stats: Stats
  summary: string
  template_id: number
  title: string
  top_video_info: null
  type: number
  words: number
  [property: string]: any
}

type Lv5440 = {
  area_v2_name: string
  cover: string
  face: string
  live_status: number
  online: number
  pendent_ru: string
  pendent_ru_color: string
  pendent_ru_pic: string
  role: number
  room_id: number
  title: string
  uid: number
  uname: string
  [property: string]: any
}
