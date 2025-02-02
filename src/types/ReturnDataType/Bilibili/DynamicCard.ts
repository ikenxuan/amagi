export type DynamicCard = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  card: DataCard;
  [property: string]: any
}

type DataCard = {
  card: string
  desc: Desc
  display: Display
  extend_json: string;
  [property: string]: any
}

type Desc = {
  acl: number
  bvid: string
  comment: number
  dynamic_id: number
  dynamic_id_str: string
  inner_id: number
  is_liked: number
  like: number
  orig_dy_id: number
  orig_dy_id_str: string
  orig_type: number
  origin: null
  pre_dy_id: number
  pre_dy_id_str: string
  previous: null
  r_type: number
  repost: number
  rid: number
  rid_str: string
  spec_type: number
  status: number
  stype: number
  timestamp: number
  type: number
  uid: number
  uid_type: number
  user_profile: UserProfile
  view: number;
  [property: string]: any
}

type UserProfile = {
  card: UserProfileCard
  info: Info
  level_info: LevelInfo
  pendant: Pendant
  rank: string
  sign: string
  vip: Vip;
  [property: string]: any
}

type UserProfileCard = {
  official_verify: OfficialVerify;
  [property: string]: any
}

type OfficialVerify = {
  type: number;
  [property: string]: any
}

type Info = {
  face: string
  uid: number
  uname: string;
  [property: string]: any
}

type LevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: string;
  [property: string]: any
}

type Pendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  name: string
  pid: number;
  [property: string]: any
}

type Vip = {
  accessStatus: number
  avatar_subscript: number
  avatar_subscript_url: string
  dueRemark: string
  label: Label
  nickname_color: string
  role: number
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number;
  [property: string]: any
}

type Label = {
  bg_color: string
  bg_style: number
  border_color: string
  label_theme: string
  path: string
  text: string
  text_color: string;
  [property: string]: any
}

type Display = {
  emoji_info: null
  highlight: null
  live_info: null
  origin: null
  relation: Relation
  usr_action_txt: string;
  [property: string]: any
}

type Relation = {
  is_follow: number
  is_followed: number
  status: number;
  [property: string]: any
}
