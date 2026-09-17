// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/userSpaceInfo.requests.json 里
//   host_mid  变体0

export type UserSpaceInfo_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  attestation: Attestation
  birthday: string
  certificate_show: boolean
  coins: number
  contract: null
  control: number
  elec: Elec
  face: string
  face_nft: number
  face_nft_type: number
  fans_badge: boolean
  fans_medal: FansMedal
  gaia_data: null
  gaia_res_type: number
  is_followed: boolean
  is_risk: boolean
  is_senior_member: number
  jointime: number
  level: number
  live_room: LiveRoom
  mcn_info: null
  mid: number
  moral: number
  name: string
  name_render: null
  nameplate: Nameplate
  official: Official
  pendant: Pendant
  profession: Profession
  rank: number
  school: null
  series: Series
  sex: string
  sign: string
  silence: number
  sys_notice: { [property: string]: any }
  tags: null
  theme: null
  top_photo: string
  top_photo_v2: TopPhotoV2
  user_honour_info: UserHonourInfo
  vip: Vip
  [property: string]: any
}

type Attestation = {
  common_info: CommonInfo
  desc: string
  icon: string
  splice_info: SpliceInfo
  type: number
  [property: string]: any
}

type CommonInfo = {
  prefix: string
  prefix_title: string
  title: string
  [property: string]: any
}

type SpliceInfo = {
  title: string
  [property: string]: any
}

type Elec = {
  show_info: ShowInfo
  [property: string]: any
}

type ShowInfo = {
  icon: string
  jump_url: string
  jump_url_web: string
  list: null
  long_title: string
  show: boolean
  state: number
  title: string
  total: number
  upower_count_show: boolean
  [property: string]: any
}

type FansMedal = {
  detail: null
  medal: null
  show: boolean
  wear: boolean
  [property: string]: any
}

type LiveRoom = {
  broadcast_type: number
  cover: string
  liveStatus: number
  roomStatus: number
  roomid: number
  roundStatus: number
  title: string
  url: string
  watched_show: WatchedShow
  [property: string]: any
}

type WatchedShow = {
  icon: string
  icon_location: string
  icon_web: string
  num: number
  switch: boolean
  text_large: string
  text_small: string
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

type Official = {
  desc: string
  role: number
  title: string
  type: number
  [property: string]: any
}

type Pendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number
  [property: string]: any
}

type Profession = {
  department: string
  is_show: number
  name: string
  title: string
  [property: string]: any
}

type Series = {
  show_upgrade_window: boolean
  user_upgrade_status: number
  [property: string]: any
}

type TopPhotoV2 = {
  l_200h_img: string
  l_img: string
  sid: number
  [property: string]: any
}

type UserHonourInfo = {
  colour: null
  is_latest_100honour: number
  mid: number
  tags: unknown[]
  [property: string]: any
}

type Vip = {
  avatar_icon: AvatarIcon
  avatar_subscript: number
  avatar_subscript_url: string
  due_date: number
  label: Label
  nickname_color: string
  ott_info: OttInfo
  role: number
  status: number
  super_vip: SuperVip
  theme_type: number
  tv_due_date: number
  tv_vip_pay_type: number
  tv_vip_status: number
  type: number
  vip_pay_type: number
  [property: string]: any
}

type AvatarIcon = {
  icon_resource: IconResource
  icon_type: number
  [property: string]: any
}

type IconResource = {
  type: number
  url: string
  [property: string]: any
}

type Label = {
  bg_color: string
  bg_style: number
  border_color: string
  img_label_uri_hans: string
  img_label_uri_hans_static: string
  img_label_uri_hant: string
  img_label_uri_hant_static: string
  img_label_uri_i18n: string
  img_label_uri_i18n_static: string
  label_goto: LabelGoto
  label_id: number
  label_theme: string
  label_type: number
  path: string
  text: string
  text_color: string
  use_img_label: boolean
  [property: string]: any
}

type LabelGoto = {
  mobile: string
  pc_web: string
  [property: string]: any
}

type OttInfo = {
  overdue_time: number
  pay_channel_id: string
  pay_type: number
  status: number
  vip_type: number
  [property: string]: any
}

type SuperVip = {
  is_super_vip: boolean
  [property: string]: any
}
