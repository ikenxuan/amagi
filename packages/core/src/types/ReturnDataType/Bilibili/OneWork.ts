export type BiliOneWork = {
  code: number
  data: Data
  message: string
  ttl: number;
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
  dimension: DataDimension
  disable_show_up_info: boolean
  duration: number
  dynamic: string
  enable_vt: number
  honor_reply: { [key: string]: any }
  is_chargeable_season: boolean
  is_season_display: boolean
  is_story: boolean
  is_story_play: number
  is_upower_exclusive: boolean
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
  stat: Stat
  state: number
  subtitle: Subtitle
  teenage_mode: number
  tid: number
  tid_v2: number
  title: string
  tname: string
  tname_v2: string
  user_garb: UserGarb
  videos: number
  vt_display: string;
  [property: string]: any
}

type ArgueInfo = {
  argue_link: string
  argue_msg: string
  argue_type: number;
  [property: string]: any
}

type DescV2 = {
  biz_id?: number
  raw_text?: string
  type?: number;
  [property: string]: any
}

type DataDimension = {
  height: number
  rotate: number
  width: number;
  [property: string]: any
}

type Owner = {
  face: string
  mid: number
  name: string;
  [property: string]: any
}

type Page = {
  cid?: number
  dimension?: PageDimension
  duration?: number
  first_frame?: string
  from?: string
  page?: number
  part?: string
  vid?: string
  weblink?: string;
  [property: string]: any
}

type PageDimension = {
  height: number
  rotate: number
  width: number;
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
  ugc_pay_preview: number;
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
  vt: number;
  [property: string]: any
}

type Subtitle = {
  allow_submit: boolean
  list: string[];
  [property: string]: any
}

type UserGarb = {
  url_image_ani_cut: string;
  [property: string]: any
}
