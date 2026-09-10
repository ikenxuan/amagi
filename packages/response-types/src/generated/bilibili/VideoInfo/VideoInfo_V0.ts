// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/videoInfo.requests.json 里
//   bvid  变体0

export type VideoInfo_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  aid: number
  argue_info: ArgueInfo
  bvid: string
  cid: number
  copyright: number
  ctime: number
  desc: string
  desc_v2: DescV2[]
  dimension: Dimension
  disable_show_up_info: boolean
  duration: number
  dynamic: string
  enable_vt: number
  honor_reply: { [property: string]: any }
  is_chargeable_season: boolean
  is_hua_sheng: boolean
  is_season_display: boolean
  is_story: boolean
  is_story_play: number
  is_upower_exclusive: boolean
  is_upower_exclusive_with_qa: boolean
  is_upower_play: boolean
  is_upower_preview: boolean
  is_view_self: boolean
  like_icon: string
  need_jump_bv: boolean
  no_cache: boolean
  owner: Owner
  pages: Page[]
  pic: string
  premiere: null
  pubdate: number
  rights: Rights
  season_id: number
  stat: Stat
  state: number
  subtitle: Subtitle
  teenage_mode: number
  tid: number
  tid_v2: number
  title: string
  tname: string
  tname_v2: string
  ugc_season: UgcSeason
  user_garb: UserGarb
  videos: number
  vt_display: string
  [property: string]: any
}

type ArgueInfo = {
  argue_link: string
  argue_msg: string
  argue_type: number
  [property: string]: any
}

type DescV2 = {
  biz_id: number
  raw_text: string
  type: number
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

type Page = {
  cid: number
  ctime: number
  dimension: Dimension
  duration: number
  first_frame: string
  from: string
  page: number
  part: string
  vid: string
  weblink: string
  [property: string]: any
}

type Rights = {
  arc_pay: number
  autoplay: number
  bp: number
  clean_mode: number
  download: number
  elec: number
  free_watch: number
  hd5: number
  is_360: number
  is_cooperation: number
  is_stein_gate: number
  movie: number
  no_background: number
  no_reprint: number
  no_share: number
  pay: number
  ugc_pay: number
  ugc_pay_preview: number
  [property: string]: any
}

type Stat = {
  aid: number
  coin: number
  danmaku: number
  dislike: number
  evaluation: string
  favorite: number
  his_rank: number
  like: number
  now_rank: number
  reply: number
  share: number
  view: number
  vt: number
  [property: string]: any
}

type Subtitle = {
  allow_submit: boolean
  list: unknown[]
  [property: string]: any
}

type UgcSeason = {
  attribute: number
  cover: string
  enable_vt: number
  ep_count: number
  id: number
  intro: string
  is_pay_season: boolean
  mid: number
  season_type: number
  sections: Section[]
  sign_state: number
  stat: Stat3
  title: string
  [property: string]: any
}

type Section = {
  episodes: Episode[]
  id: number
  season_id: number
  title: string
  type: number
  [property: string]: any
}

type Episode = {
  aid: number
  arc: Arc
  attribute: number
  bvid: string
  cid: number
  id: number
  page: Page2
  pages: Page2[]
  season_id: number
  section_id: number
  title: string
  [property: string]: any
}

type Arc = {
  aid: number
  author: Owner
  copyright: number
  ctime: number
  desc: string
  desc_v2: null
  dimension: Dimension
  duration: number
  dynamic: string
  enable_vt: number
  is_blooper: boolean
  is_chargeable_season: boolean
  is_lesson_video: number
  pic: string
  pubdate: number
  rights: Rights2
  stat: Stat2
  state: number
  title: string
  type_id: number
  type_id_v2: number
  type_name: string
  type_name_v2: string
  videos: number
  vt_display: string
  [property: string]: any
}

type Rights2 = {
  arc_pay: number
  autoplay: number
  bp: number
  download: number
  elec: number
  free_watch: number
  hd5: number
  is_cooperation: number
  movie: number
  no_reprint: number
  pay: number
  ugc_pay: number
  ugc_pay_preview: number
  [property: string]: any
}

type Stat2 = {
  aid: number
  argue_msg: string
  coin: number
  danmaku: number
  dislike: number
  evaluation: string
  fav: number
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

type Page2 = {
  cid: number
  dimension: Dimension
  duration: number
  from: string
  page: number
  part: string
  vid: string
  weblink: string
  [property: string]: any
}

type Stat3 = {
  coin: number
  danmaku: number
  fav: number
  his_rank: number
  like: number
  now_rank: number
  reply: number
  season_id: number
  share: number
  view: number
  vt: number
  vv: number
  [property: string]: any
}

type UserGarb = {
  url_image_ani_cut: string
  [property: string]: any
}
