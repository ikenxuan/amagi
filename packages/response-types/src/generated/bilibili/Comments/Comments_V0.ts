// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/comments.requests.json 里
//   oid / type  变体0

export type Comments_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  assist: number
  blacklist: number
  callbacks: null
  config: Config
  control: Control
  cursor: Cursor
  effects: Effects
  note: number
  replies: Reply[]
  top: Top
  top_replies: unknown[]
  upper: Upper
  vote: number
  [property: string]: any
}

type Config = {
  read_only: boolean
  show_up_flag: boolean
  showtopic: number
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
  web_selection: boolean
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
  support_mode: number[]
  [property: string]: any
}

type PaginationReply = {
  next_offset: string
  [property: string]: any
}

type Effects = {
  preloading: string
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
  dynamic_id?: number
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
  replies: Reply2[] | null
  reply_control: ReplyControl2
  root: number
  root_str: string
  rpid: number
  rpid_str: string
  state: number
  track_info: string
  type: number
  up_action: UpAction
  [property: string]: any
}

type Content = {
  emote?: Emote
  jump_url: { [property: string]: any }
  max_line: number
  members: unknown[]
  message: string
  picture_scale?: number
  pictures?: Picture[]
  [property: string]: any
}

type Emote = {
  '[doge]'?: Doge
  '[笑哭]'?: Doge
  '[给心心]'?: Doge
  [property: string]: any
}

type Doge = {
  attr: number
  id: number
  jump_title: string
  meta: Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string
  [property: string]: any
}

type Meta = {
  size: number
  suggest: string[]
  [property: string]: any
}

type Picture = {
  img_height: number
  img_size: number
  img_src: string
  img_width: number
  play_gif_thumbnail?: boolean
  top_right_icon?: string
  [property: string]: any
}

type Folder = {
  has_folded: boolean
  is_folded: boolean
  rule: string
  [property: string]: any
}

type Member = {
  avatar: string
  avatar_item: AvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: FansDetail | null
  handle: string
  is_contractor: boolean
  is_senior_member: number
  level_info: LevelInfo
  mid: string
  nameplate: Nameplate
  nft_interaction: null
  official_verify: OfficialVerify
  pendant: Pendant
  rank: string
  senior: Senior
  sex: string
  sign: string
  uname: string
  user_sailing: UserSailing
  user_sailing_v2: UserSailingV2
  vip: Vip
  [property: string]: any
}

type AvatarItem = {
  container_size: ContainerSize
  fallback_layers: FallbackLayers
  mid: string
  [property: string]: any
}

type ContainerSize = {
  height: number
  width: number
  [property: string]: any
}

type FallbackLayers = {
  is_critical_group: boolean
  layers: Layer[]
  [property: string]: any
}

type Layer = {
  general_spec: GeneralSpec
  layer_config: LayerConfig
  resource: Resource
  visible: boolean
  [property: string]: any
}

type GeneralSpec = {
  pos_spec: PosSpec
  render_spec: RenderSpec
  size_spec: ContainerSize
  [property: string]: any
}

type PosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number
  [property: string]: any
}

type RenderSpec = {
  opacity: number
  [property: string]: any
}

type LayerConfig = {
  is_critical?: boolean
  layer_mask?: LayerMask
  tags: Tags
  [property: string]: any
}

type LayerMask = {
  general_spec: GeneralSpec
  mask_src: MaskSrc
  [property: string]: any
}

type MaskSrc = {
  draw: Draw
  src_type: number
  [property: string]: any
}

type Draw = {
  color_config: ColorConfig
  draw_type: number
  fill_mode: number
  [property: string]: any
}

type ColorConfig = {
  day: Day
  [property: string]: any
}

type Day = {
  argb: string
  [property: string]: any
}

type Tags = {
  AVATAR_LAYER?: { [property: string]: any }
  ICON_LAYER?: { [property: string]: any }
  PENDENT_LAYER?: { [property: string]: any }
  [property: string]: any
}

type Resource = {
  res_animation?: ResAnimation
  res_image?: ResImage
  res_native_draw?: ResNativeDraw
  res_type: number
  [property: string]: any
}

type ResAnimation = {
  webp_src: WebpSrc
  [property: string]: any
}

type WebpSrc = {
  remote: Remote
  src_type: number
  [property: string]: any
}

type Remote = {
  bfs_style: string
  url: string
  [property: string]: any
}

type ResImage = {
  image_src: ImageSrc
  [property: string]: any
}

type ImageSrc = {
  placeholder?: number
  remote: Remote
  src_type: number
  [property: string]: any
}

type ResNativeDraw = {
  draw_src: DrawSrc
  [property: string]: any
}

type DrawSrc = {
  draw: Draw2
  src_type: number
  [property: string]: any
}

type Draw2 = {
  color_config: ColorConfig2
  draw_type: number
  fill_mode: number
  [property: string]: any
}

type ColorConfig2 = {
  day: Day
  is_dark_mode_aware: boolean
  night: Day
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
  uid: number
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

type Senior = {
  status?: number
  [property: string]: any
}

type UserSailing = {
  cardbg: Cardbg | null
  cardbg_with_focus: null
  pendant: Pendant2 | null
  [property: string]: any
}

type Cardbg = {
  fan: Fan
  id: number
  image: string
  image_group: null
  jump_url: string
  name: string
  type: string
  [property: string]: any
}

type Fan = {
  color: string
  color_format: ColorFormat
  is_fan: number
  name: string
  num_desc: string
  num_prefix: string
  number: number
  [property: string]: any
}

type ColorFormat = {
  colors: string[]
  end_point: string
  gradients: number[]
  start_point: string
  [property: string]: any
}

type Pendant2 = {
  id: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  jump_url: string
  name: string
  type: string
  [property: string]: any
}

type UserSailingV2 = {
  card_bg?: CardBg
  pendant?: Pendant3
  [property: string]: any
}

type CardBg = {
  fan: Fan2
  id: number
  image: string
  jump_url: string
  name: string
  type: string
  [property: string]: any
}

type Fan2 = {
  color: string
  color_format: ColorFormat
  is_fan: number
  name?: string
  num_desc: string
  num_prefix: string
  number: number
  [property: string]: any
}

type Pendant3 = {
  id: number
  image: string
  image_enhance: string
  image_enhance_frame?: string
  name: string
  type?: string
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
  vipType: number
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
  label_goto: LabelGoto | null
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

type Reply2 = {
  action: number
  assist: number
  attr: number
  content: Content2
  count: number
  ctime: number
  dialog: number
  dialog_str: string
  dynamic_id_str: string
  fansgrade: number
  folder: Folder
  invisible: boolean
  like: number
  member: Member3
  mid: number
  mid_str: string
  note_cvid_str: string
  oid: number
  oid_str: string
  parent: number
  parent_reply_member?: ParentReplyMember
  parent_str: string
  rcount: number
  replies: null
  reply_control: ReplyControl
  root: number
  root_str: string
  rpid: number
  rpid_str: string
  state: number
  track_info: string
  type: number
  up_action: UpAction
  [property: string]: any
}

type Content2 = {
  at_name_to_mid?: AtNameToMid
  at_name_to_mid_str?: AtNameToMidStr
  emote?: Emote2
  jump_url: { [property: string]: any }
  max_line: number
  members: Member2[]
  message: string
  [property: string]: any
}

type AtNameToMid = {
  '你看到我硬币了吗'?: number
  '莳瘾SIN'?: number
  [property: string]: any
}

type AtNameToMidStr = {
  '你看到我硬币了吗'?: string
  '莳瘾SIN'?: string
  [property: string]: any
}

type Emote2 = {
  '[doge_金箍]'?: Doge
  '[tv_惊吓]'?: Tv
  '[冷]'?: Doge
  '[原神_哭哭]'?: Doge
  '[大哭]'?: Doge
  '[委屈]'?: Doge
  '[抓狂]'?: Doge
  '[辣眼睛]'?: Doge
  [property: string]: any
}

type Tv = {
  attr: number
  gif_url: string
  id: number
  jump_title: string
  meta: Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string
  [property: string]: any
}

type Member2 = {
  avatar: string
  face_nft_new: number
  handle: string
  is_senior_member: number
  level_info: LevelInfo
  mid: string
  nameplate: Nameplate
  official_verify: OfficialVerify
  pendant: Pendant
  rank: string
  senior: { [property: string]: any }
  sex: string
  sign: string
  uname: string
  vip: Vip2
  [property: string]: any
}

type Vip2 = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: Label2
  nickname_color: string
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number
  [property: string]: any
}

type Label2 = {
  bg_color: string
  bg_style: number
  border_color: string
  img_label_uri_hans: string
  img_label_uri_hans_static: string
  img_label_uri_hant: string
  img_label_uri_hant_static: string
  img_label_uri_i18n: string
  img_label_uri_i18n_static: string
  label_goto: null
  label_id: number
  label_theme: string
  label_type: number
  path: string
  text: string
  text_color: string
  use_img_label: boolean
  [property: string]: any
}

type Member3 = {
  avatar: string
  avatar_item: AvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: FansDetail | null
  handle: string
  is_contractor: boolean
  is_senior_member: number
  level_info: LevelInfo
  mid: string
  nameplate: Nameplate
  nft_interaction: null
  official_verify: OfficialVerify
  pendant: Pendant
  rank: string
  senior: Senior
  sex: string
  sign: string
  uname: string
  user_sailing: UserSailing2 | null
  user_sailing_v2?: UserSailingV22
  vip: Vip
  [property: string]: any
}

type UserSailing2 = {
  cardbg: Cardbg
  cardbg_with_focus: null
  pendant: Pendant2
  [property: string]: any
}

type UserSailingV22 = {
  card_bg: CardBg2
  pendant: Pendant3
  [property: string]: any
}

type CardBg2 = {
  fan: Fan
  id: number
  image: string
  jump_url: string
  name: string
  type: string
  [property: string]: any
}

type ParentReplyMember = {
  mid: string
  name: string
  [property: string]: any
}

type ReplyControl = {
  max_line: number
  support_share: boolean
  time_desc: string
  translation_switch: number
  [property: string]: any
}

type UpAction = {
  like: boolean
  reply: boolean
  [property: string]: any
}

type ReplyControl2 = {
  biz_scene?: string
  is_note_v2?: boolean
  max_line: number
  sub_reply_entry_text?: string
  sub_reply_title_text?: string
  support_share: boolean
  time_desc: string
  translation_switch: number
  [property: string]: any
}

type Top = {
  admin: null
  upper: null
  vote: null
  [property: string]: any
}

type Upper = {
  mid: number
  [property: string]: any
}
