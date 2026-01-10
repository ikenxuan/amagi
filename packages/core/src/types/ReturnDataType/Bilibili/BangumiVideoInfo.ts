export type BiliBangumiVideoInfo = {
  code: number
  message: string
  result: Result;
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
  episodes: ResultEpisode[]
  evaluate: string
  freya: Freya
  hide_ep_vv_vt_dm: number
  icon_font: ResultIconFont
  jp_title: string
  link: string
  media_id: number
  mode: number
  new_ep: ResultNewEp
  payment: Payment
  play_strategy: PlayStrategy
  positive: Positive
  publish: Publish
  rating: Rating
  record: string
  rights: ResultRights
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
  stat: ResultStat
  status: number
  styles: string[]
  subtitle: string
  title: string
  total: number
  type: number
  up_info: UpInfo
  user_status: UserStatus;
  [property: string]: any
}

type Activity = {
  head_bg_url: string
  id: number
  title: string;
  [property: string]: any
}

type Area = {
  id?: number
  name?: string;
  [property: string]: any
}

type ResultEpisode = {
  aid: number
  badge: string
  badge_info: PurpleBadgeInfo
  badge_type: number
  bvid: string
  cid: number
  cover: string
  dimension: PurpleDimension
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
  rights: PurpleRights
  section_type: number
  share_copy: string
  share_url: string
  short_link: string
  show_title: string
  showDrmLoginDialog: boolean
  status: number
  subtitle: string
  title: string
  vid: string;
  [property: string]: any
}

type PurpleBadgeInfo = {
  bg_color: string
  bg_color_night: string
  text: string;
  [property: string]: any
}

type PurpleDimension = {
  height: number
  rotate: number
  width: number;
  [property: string]: any
}

type PurpleRights = {
  allow_demand: number
  allow_dm: number
  allow_download: number
  area_limit: number;
  [property: string]: any
}

type Freya = {
  bubble_desc: string
  bubble_show_cnt: number
  icon_show: number;
  [property: string]: any
}

type ResultIconFont = {
  name: string
  text: string;
  [property: string]: any
}

type ResultNewEp = {
  desc: string
  id: number
  is_new: number
  title: string;
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
  vip_promotion: string;
  [property: string]: any
}

type PayType = {
  allow_discount: number
  allow_pack: number
  allow_ticket: number
  allow_time_limit: number
  allow_vip_discount: number
  forbid_bb: number;
  [property: string]: any
}

type PlayStrategy = {
  strategies: string[];
  [property: string]: any
}

type Positive = {
  id: number
  title: string;
  [property: string]: any
}

type Publish = {
  is_finish: number
  is_started: number
  pub_time: string
  pub_time_show: string
  unknow_pub_date: number
  weekday: number;
  [property: string]: any
}

type Rating = {
  count: number
  score: number;
  [property: string]: any
}

type ResultRights = {
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
  only_vip_download: number
  resource: string
  watch_platform: number;
  [property: string]: any
}

type Season = {
  badge?: string
  badge_info?: SeasonBadgeInfo
  badge_type?: number
  cover?: string
  enable_vt?: boolean
  horizontal_cover_1610?: string
  horizontal_cover_169?: string
  icon_font?: SeasonIconFont
  media_id?: number
  new_ep?: SeasonNewEp
  season_id?: number
  season_title?: string
  season_type?: number
  stat?: SeasonStat;
  [property: string]: any
}

type SeasonBadgeInfo = {
  bg_color: string
  bg_color_night: string
  text: string;
  [property: string]: any
}

type SeasonIconFont = {
  name: string
  text: string;
  [property: string]: any
}

type SeasonNewEp = {
  cover: string
  id: number
  index_show: string;
  [property: string]: any
}

type SeasonStat = {
  favorites: number
  series_follow: number
  views: number
  vt: number;
  [property: string]: any
}

type Section = {
  attr: number
  episode_id: number
  episode_ids: string[]
  episodes: SectionEpisode[]
  id: number
  title: string
  type: number
  type2: number;
  [property: string]: any
}

type SectionEpisode = {
  aid: number
  badge: string
  badge_info: FluffyBadgeInfo
  badge_type: number
  bvid: string
  cid: number
  cover: string
  dimension: FluffyDimension
  duration: number
  enable_vt: boolean
  ep_id: number
  from: string
  icon_font: EpisodeIconFont
  id: number
  is_view_hide: boolean
  link: string
  long_title: string
  pub_time: number
  pv: number
  release_date: string
  rights: FluffyRights
  section_type: number
  share_copy: string
  share_url: string
  short_link: string
  show_title: string
  showDrmLoginDialog: boolean
  stat: EpisodeStat
  stat_for_unity: StatForUnity
  status: number
  subtitle: string
  title: string
  vid: string;
  [property: string]: any
}

type FluffyBadgeInfo = {
  bg_color: string
  bg_color_night: string
  text: string;
  [property: string]: any
}

type FluffyDimension = {
  height: number
  rotate: number
  width: number;
  [property: string]: any
}

type EpisodeIconFont = {
  name: string
  text: string;
  [property: string]: any
}

type FluffyRights = {
  allow_demand: number
  allow_dm: number
  allow_download: number
  area_limit: number;
  [property: string]: any
}

type EpisodeStat = {
  coin: number
  danmakus: number
  likes: number
  play: number
  reply: number
  vt: number;
  [property: string]: any
}

type StatForUnity = {
  coin: number
  danmaku: Danmaku
  likes: number
  reply: number
  vt: Vt;
  [property: string]: any
}

type Danmaku = {
  icon: string
  pure_text: string
  text: string
  value: number;
  [property: string]: any
}

type Vt = {
  icon: string
  pure_text: string
  text: string
  value: number;
  [property: string]: any
}

type Series = {
  display_type: number
  series_id: number
  series_title: string;
  [property: string]: any
}

type Show = {
  wide_screen: number;
  [property: string]: any
}

type ResultStat = {
  coins: number
  danmakus: number
  favorite: number
  favorites: number
  follow_text: string
  likes: number
  reply: number
  share: number
  views: number
  vt: number;
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
  vip_type: number;
  [property: string]: any
}

type Pendant = {
  image: string
  name: string
  pid: number;
  [property: string]: any
}

type VipLabel = {
  bg_color: string
  bg_style: number
  border_color: string
  text: string
  text_color: string;
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
  progress: Progress
  sponsor: number
  vip_info: VipInfo;
  [property: string]: any
}

type Progress = {
  last_ep_id: number
  last_ep_index: string
  last_time: number;
  [property: string]: any
}

type VipInfo = {
  due_date: number
  status: number
  type: number;
  [property: string]: any
}
