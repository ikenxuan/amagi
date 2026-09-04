// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。

export type UserCard_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  archive_count: number
  article_count: number
  card: Card
  follower: number
  following: boolean
  like_num: number
  space: Space
  [property: string]: any
}

type Card = {
  DisplayRank: string
  Official: Official
  approve: boolean
  article: number
  attention: number
  attentions: unknown[]
  birthday: string
  description: string
  face: string
  face_nft: number
  face_nft_type: number
  fans: number
  friend: number
  is_senior_member: number
  level_info: LevelInfo
  mid: string
  name: string
  name_render: null
  nameplate: Nameplate
  official_verify: OfficialVerify
  pendant: Pendant
  place: string
  rank: string
  regtime: number
  sex: string
  sign: string
  spacesta: number
  vip: Vip
  [property: string]: any
}

type Official = {
  desc: string
  role: number
  title: string
  type: number
  [property: string]: any
}

type LevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number
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
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number
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
  vipStatus: number
  vipType: number
  vip_pay_type: number
  [property: string]: any
}

type AvatarIcon = {
  icon_resource: { [property: string]: any }
  icon_type: number
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

type Space = {
  l_img: string
  s_img: string
  [property: string]: any
}
