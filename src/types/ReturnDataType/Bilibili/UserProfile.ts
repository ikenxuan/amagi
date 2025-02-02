export type UserProfile = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  archive_count: number
  article_count: number
  card: Card
  follower: number
  following: boolean
  like_num: number
  space: Space;
  [property: string]: any
}

type Card = {
  approve: boolean
  article: number
  attention: number
  attentions: string[]
  birthday: string
  description: string
  DisplayRank: string
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
  Official: Official
  official_verify: OfficialVerify
  pendant: Pendant
  place: string
  rank: string
  regtime: number
  sex: string
  sign: string
  spacesta: number
  vip: Vip;
  [property: string]: any
}

type Official = {
  desc: string
  role: number
  title: string
  type: number;
  [property: string]: any
}

type LevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number;
  [property: string]: any
}

type Nameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number;
  [property: string]: any
}

type OfficialVerify = {
  desc: string
  type: number;
  [property: string]: any
}

type Pendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number;
  [property: string]: any
}

type Vip = {
  avatar_icon: AvatarIcon
  avatar_subscript: number
  avatar_subscript_url: string
  due_date: number
  label: Label
  nickname_color: string
  role: number
  status: number
  theme_type: number
  tv_due_date: number
  tv_vip_pay_type: number
  tv_vip_status: number
  type: number
  vip_pay_type: number
  vipStatus: number
  vipType: number;
  [property: string]: any
}

type AvatarIcon = {
  icon_resource: IconResource
  icon_type: number;
  [property: string]: any
}

type IconResource = {
  type: number
  url: string;
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
  label_theme: string
  path: string
  text: string
  text_color: string
  use_img_label: boolean;
  [property: string]: any
}

type Space = {
  l_img: string
  s_img: string;
  [property: string]: any
}
