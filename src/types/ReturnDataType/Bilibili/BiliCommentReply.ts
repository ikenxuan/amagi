import { BiliEmojiList } from './EmojiList'

export type BiliCommentReply = {
  code: number
  data: DataData
  message: string
  ttl: number;
  [property: string]: any
}

type DataData = {
  assist: number
  blacklist: number
  callbacks: { [key: string]: any }
  cm_info: CmInfo
  config: Config
  control: Control
  cursor: Cursor
  effects: Effects
  note: number
  replies: Reply[]
  top: Top
  top_replies: string[]
  upper: Upper
  vote: number;
  [property: string]: any
}

type CmInfo = {
  ads: Ads;
  [property: string]: any
}

type Ads = {
  4763: The4763[];
  [property: string]: any
}

type The4763 = {
  activity_type?: number
  ad_cb?: string
  ad_desc?: string
  adver_name?: string
  agency?: string
  area?: number
  cm_mark?: number
  contract_id?: string
  creative_id?: number
  creative_type?: number
  epid?: number
  id?: number
  intro?: string
  is_ad?: boolean
  is_ad_loc?: boolean
  label?: string
  litpic?: string
  mid?: string
  name?: string
  null_frame?: boolean
  pic?: string
  pic_main_color?: string
  pos_num?: number
  request_id?: string
  server_type?: number
  show_url?: string
  src_id?: number
  stime?: number
  style?: number
  sub_title?: string
  title?: string
  url?: string;
  [property: string]: any
}

type Config = {
  read_only: boolean
  show_up_flag: boolean
  showtopic: number;
  [property: string]: any
}

type Control = {
  answer_guide_android_url: string
  answer_guide_icon_url: string
  answer_guide_ios_url: string
  answer_guide_text: string
  bg_text: string
  child_input_text: string
  disable_jump_emote: boolean
  empty_page: null
  enable_charged: boolean
  enable_cm_biz_helper: boolean
  giveup_input_text: string
  input_disable: boolean
  preload_resources: null
  root_input_text: string
  screenshot_icon_state: number
  show_text: string
  show_type: number
  upload_picture_icon_state: number
  web_selection: boolean;
  [property: string]: any
}

type Cursor = {
  all_count: number
  is_begin: boolean
  is_end: boolean
  mode: number
  mode_text: string
  name: string
  next: number
  pagination_reply: PaginationReply
  prev: number
  session_id: string
  support_mode: number[];
  [property: string]: any
}

type PaginationReply = {
  next_offset: string;
  [property: string]: any
}

type Effects = {
  preloading: string;
  [property: string]: any
}

type Reply = {
  action: number
  assist: number
  attr: number
  content: Content
  count: number
  ctime: number
  dialog: number
  dialog_str: string
  dynamic_id: number
  dynamic_id_str: string
  fansgrade: number
  folder: Folder
  invisible: boolean
  like: number
  member: Member
  mid: number
  mid_str: string
  note_cvid_str: string
  oid: number
  oid_str: string
  parent: number
  parent_str: string
  rcount: number
  replies: string[]
  reply_control: ReplyControl
  root: number
  root_str: string
  rpid: number
  rpid_str: string
  state: number
  track_info: string
  type: number
  up_action: UpAction;
  [property: string]: any
}

type Content = {
  emote?: Record<string, BiliEmojiList['data']['packages'][number]>
  jump_url: { [key: string]: any }
  max_line: number
  members: string[]
  message: string
  picture_scale: number
  pictures: Picture[];
  [property: string]: any
}

type Picture = {
  img_height: number
  img_size: number
  img_src: string
  img_width: number
  play_gif_thumbnail?: boolean
  top_right_icon?: string;
  [property: string]: any
}

type Folder = {
  has_folded: boolean
  is_folded: boolean
  rule: string;
  [property: string]: any
}

type Member = {
  avatar: string
  avatar_item: AvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: null | FansDetail
  is_contractor: boolean
  is_senior_member: number
  level_info: LevelInfo
  mid: string
  nameplate: Nameplate
  nft_interaction: null
  official_verify: OfficialVerify
  pendant: MemberPendant
  rank: string
  senior: Senior
  sex: string
  sign: string
  uname: string
  user_sailing: UserSailing
  user_sailing_v2: UserSailingV2
  vip: Vip;
  [property: string]: any
}

type AvatarItem = {
  container_size: ContainerSize
  fallback_layers: FallbackLayers
  mid: string;
  [property: string]: any
}

type ContainerSize = {
  height: number
  width: number;
  [property: string]: any
}

type FallbackLayers = {
  is_critical_group: boolean
  layers: Layer[];
  [property: string]: any
}

type Layer = {
  general_spec: GeneralSpec
  layer_config: LayerConfig
  resource: Resource
  visible: boolean;
  [property: string]: any
}

type GeneralSpec = {
  pos_spec: PosSpec
  render_spec: RenderSpec
  size_spec: SizeSpec;
  [property: string]: any
}

type PosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number;
  [property: string]: any
}

type RenderSpec = {
  opacity: number;
  [property: string]: any
}

type SizeSpec = {
  height: number
  width: number;
  [property: string]: any
}

type LayerConfig = {
  is_critical: boolean
  tags: Tags;
  [property: string]: any
}

type Tags = {
  AVATAR_LAYER: { [key: string]: any }
  GENERAL_CFG: GeneralCFG
  ICON_LAYER?: { [key: string]: any }
  PENDENT_LAYER?: { [key: string]: any };
  [property: string]: any
}

type GeneralCFG = {
  config_type: number
  general_config: GeneralConfig;
  [property: string]: any
}

type GeneralConfig = {
  web_css_style: WebcssStyle;
  [property: string]: any
}

type WebcssStyle = {
  'background-color'?: string
  border?: string
  borderRadius: string
  boxSizing?: string;
  [property: string]: any
}

type Resource = {
  res_image: ResImage
  res_type: number;
  [property: string]: any
}

type ResImage = {
  image_src: ImageSrc;
  [property: string]: any
}

type ImageSrc = {
  local?: number
  placeholder: number
  remote: Remote
  src_type: number;
  [property: string]: any
}

type Remote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type FansDetail = {
  guard_icon: string
  guard_level: number
  honor_icon: string
  intimacy: number
  is_receive: number
  level: number
  master_status: number
  medal_color: number
  medal_color_border: number
  medal_color_end: number
  medal_color_level: number
  medal_color_name: number
  medal_id: number
  medal_level_bg_color: number
  medal_name: string
  score: number
  uid: number;
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

type MemberPendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number;
  [property: string]: any
}

type Senior = {
  status: number;
  [property: string]: any
}

type UserSailing = {
  cardbg: Cardbg
  cardbg_with_focus: null
  pendant: null | PendantPendant;
  [property: string]: any
}

type Cardbg = {
  fan: CardbgFan
  id: number
  image: string
  image_group: null
  jump_url: string
  name: string
  type: string;
  [property: string]: any
}

type CardbgFan = {
  color: string
  color_format: PurpleColorFormat
  is_fan: number
  name: string
  num_desc: string
  num_prefix: string
  number: number;
  [property: string]: any
}

type PurpleColorFormat = {
  colors: string[]
  end_point: string
  gradients: number[]
  start_point: string;
  [property: string]: any
}

type PendantPendant = {
  id: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  jump_url: string
  name: string
  type: string;
  [property: string]: any
}

type UserSailingV2 = {
  card_bg: CardBg
  pendant?: UserSailingV2Pendant;
  [property: string]: any
}

type CardBg = {
  fan: CardBgFan
  id: number
  image: string
  jump_url: string
  name: string
  type: string;
  [property: string]: any
}

type CardBgFan = {
  color: string
  color_format: FluffyColorFormat
  is_fan: number
  name?: string
  num_desc: string
  num_prefix: string
  number: number;
  [property: string]: any
}

type FluffyColorFormat = {
  colors: string[]
  end_point: string
  gradients: number[]
  start_point: string;
  [property: string]: any
}

type UserSailingV2Pendant = {
  id: number
  image: string
  image_enhance: string
  name: string
  type: string;
  [property: string]: any
}

type Vip = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: Label
  nickname_color: string
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

type ReplyControl = {
  biz_scene: string
  is_note_v2: boolean
  location: string
  max_line: number
  sub_reply_entry_text: string
  sub_reply_title_text: string
  time_desc: string
  translation_switch: number;
  [property: string]: any
}

type UpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type Top = {
  admin: null
  upper: null
  vote: null;
  [property: string]: any
}

type Upper = {
  mid: number;
  [property: string]: any
}
