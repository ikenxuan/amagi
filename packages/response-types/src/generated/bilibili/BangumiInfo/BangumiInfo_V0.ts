// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/bangumiInfo.requests.json 里
//   season_id  变体0

export type BangumiInfo_V0 = {
  code: number
  message: string
  result: Result
  [property: string]: any
}

type Result = {
  activity: Activity
  actors: string
  alias: string
  areas: Area[]
  bkg_cover: string
  cover: string
  delivery_fragment_video: boolean
  enable_vt: boolean
  episodes: Episode[]
  evaluate: string
  freya: Freya
  hide_ep_vv_vt_dm: number
  icon_font: IconFont
  jp_title: string
  link: string
  media_id: number
  mode: number
  new_ep: NewEp
  payment: Payment
  play_strategy: PlayStrategy
  positive: Positive
  publish: Publish
  rating: Rating
  record: string
  rights: Rights2
  season_id: number
  season_title: string
  seasons: Season[]
  section: Section[]
  series: Series
  share_copy: string
  share_sub_title: string
  share_url: string
  show: Show
  show_season_type: number
  square_cover: string
  staff: string
  stat: Stat3
  status: number
  styles: string[]
  subtitle: string
  title: string
  total: number
  type: number
  up_info: UpInfo
  user_status: UserStatus
  [property: string]: any
}

type Activity = {
  head_bg_url: string
  id: number
  title: string
  [property: string]: any
}

type Area = {
  id: number
  name: string
  [property: string]: any
}

type Episode = {
  aid: number
  badge: string
  badge_info: BadgeInfo
  badge_type: number
  bvid: string
  cid: number
  cover: string
  dimension: Dimension
  duration: number
  enable_vt: boolean
  ep_id: number
  from: string
  id: number
  is_view_hide: boolean
  link: string
  long_title: string
  pub_time: number
  pv: number
  release_date: string
  rights: Rights
  section_type: number
  share_copy: string
  share_url: string
  short_link: string
  showDrmLoginDialog: boolean
  show_title: string
  skip: Skip
  status: number
  subtitle: string
  title: string
  vid: string
  [property: string]: any
}

type BadgeInfo = {
  bg_color: string
  bg_color_night: string
  text: string
  [property: string]: any
}

type Dimension = {
  height: number
  rotate: number
  width: number
  [property: string]: any
}

type Rights = {
  allow_dm: number
  allow_download: number
  area_limit: number
  cache_auth: number
  [property: string]: any
}

type Skip = {
  ed: Ed
  op: Ed
  [property: string]: any
}

type Ed = {
  end: number
  start: number
  [property: string]: any
}

type Freya = {
  bubble_desc: string
  bubble_show_cnt: number
  icon_show: number
  [property: string]: any
}

type IconFont = {
  name: string
  text: string
  [property: string]: any
}

type NewEp = {
  desc: string
  id: number
  is_new: number
  title: string
  [property: string]: any
}

type Payment = {
  discount: number
  pay_type: PayType
  price: string
  promotion: string
  tip: string
  view_start_time: number
  vip_discount: number
  vip_first_promotion: string
  vip_price: string
  vip_promotion: string
  [property: string]: any
}

type PayType = {
  allow_discount: number
  allow_pack: number
  allow_ticket: number
  allow_time_limit: number
  allow_vip_discount: number
  forbid_bb: number
  [property: string]: any
}

type PlayStrategy = {
  strategies: string[]
  [property: string]: any
}

type Positive = {
  id: number
  title: string
  [property: string]: any
}

type Publish = {
  is_finish: number
  is_started: number
  pub_time: string
  pub_time_show: string
  unknow_pub_date: number
  weekday: number
  [property: string]: any
}

type Rating = {
  count: number
  score: number
  [property: string]: any
}

type Rights2 = {
  allow_bp: number
  allow_bp_rank: number
  allow_download: number
  allow_review: number
  area_limit: number
  ban_area_show: number
  can_watch: number
  copyright: string
  forbid_pre: number
  freya_white: number
  is_cover_show: number
  is_preview: number
  is_sponsor: number
  only_vip_download: number
  resource: string
  watch_platform: number
  [property: string]: any
}

type Season = {
  badge: string
  badge_info: BadgeInfo
  badge_type: number
  cover: string
  enable_vt: boolean
  horizontal_cover_1610: string
  horizontal_cover_169: string
  icon_font: IconFont
  media_id: number
  new_ep: NewEp2
  season_id: number
  season_title: string
  season_type: number
  stat: Stat
  [property: string]: any
}

type NewEp2 = {
  cover: string
  id: number
  index_show: string
  [property: string]: any
}

type Stat = {
  favorites: number
  series_follow: number
  views: number
  vt: number
  [property: string]: any
}

type Section = {
  attr: number
  episode_id: number
  episode_ids: unknown[]
  episodes: Episode2[]
  id: number
  title: string
  type: number
  type2: number
  [property: string]: any
}

type Episode2 = {
  aid: number
  badge: string
  badge_info: BadgeInfo
  badge_type: number
  bvid: string
  cid: number
  cover: string
  dimension: Dimension
  duration: number
  enable_vt: boolean
  ep_id: number
  from: string
  icon_font: IconFont
  id: number
  is_view_hide: boolean
  link: string
  long_title: string
  pub_time: number
  pv: number
  release_date: string
  rights: Rights
  section_type: number
  share_copy: string
  share_url: string
  short_link: string
  showDrmLoginDialog: boolean
  show_title: string
  skip: Skip
  stat: Stat2
  stat_for_unity: StatForUnity
  status: number
  subtitle: string
  title: string
  vid: string
  [property: string]: any
}

type Stat2 = {
  coin: number
  danmakus: number
  likes: number
  play: number
  reply: number
  vt: number
  [property: string]: any
}

type StatForUnity = {
  coin: number
  danmaku: Danmaku
  likes: number
  reply: number
  vt: Danmaku
  [property: string]: any
}

type Danmaku = {
  icon: string
  pure_text: string
  text: string
  value: number
  [property: string]: any
}

type Series = {
  display_type: number
  series_id: number
  series_title: string
  [property: string]: any
}

type Show = {
  wide_screen: number
  [property: string]: any
}

type Stat3 = {
  coins: number
  danmakus: number
  favorite: number
  favorites: number
  follow_text: string
  likes: number
  reply: number
  share: number
  views: number
  vt: number
  [property: string]: any
}

type UpInfo = {
  avatar: string
  avatar_subscript_url: string
  follower: number
  is_follow: number
  mid: number
  nickname_color: string
  pendant: Pendant
  theme_type: number
  uname: string
  verify_type: number
  vip_label: VipLabel
  vip_status: number
  vip_type: number
  [property: string]: any
}

type Pendant = {
  image: string
  name: string
  pid: number
  [property: string]: any
}

type VipLabel = {
  bg_color: string
  bg_style: number
  border_color: string
  text: string
  text_color: string
  [property: string]: any
}

type UserStatus = {
  area_limit: number
  ban_area_show: number
  follow: number
  follow_status: number
  login: number
  pay: number
  pay_pack_paid: number
  sponsor: number
  [property: string]: any
}
