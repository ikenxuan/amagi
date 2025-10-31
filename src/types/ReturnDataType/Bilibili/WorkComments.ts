export type BiliWorkComments = {
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
  replies: DataReply[]
  top: Top
  top_replies: TopReply[]
  upper: DataUpper
  vote: number;
  [property: string]: any
}

type CmInfo = {
  ads: Ads;
  [property: string]: any
}

type Ads = {
  4765: The4765[];
  [property: string]: any
}

type The4765 = {
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

type DataReply = {
  action: number
  assist: number
  attr: number
  content: PurpleContent
  count: number
  ctime: number
  dialog: number
  dialog_str: string
  dynamic_id_str: string
  fansgrade: number
  folder: PurpleFolder
  invisible: boolean
  like: number
  member: PurpleMember
  mid: number
  mid_str: string
  note_cvid_str: string
  oid: number
  oid_str: string
  parent: number
  parent_str: string
  rcount: number
  replies: ReplyReply[]
  reply_control: FluffyReplyControl
  root: number
  root_str: string
  rpid: number
  rpid_str: string
  state: number
  track_info: string
  type: number
  up_action: FluffyUpAction;
  [property: string]: any
}

type PurpleContent = {
  jump_url: { [key: string]: any }
  max_line: number
  members: string[]
  message: string;
  [property: string]: any
}

type PurpleFolder = {
  has_folded: boolean
  is_folded: boolean
  rule: string;
  [property: string]: any
}

type PurpleMember = {
  avatar: string
  avatar_item: PurpleAvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: null
  is_contractor: boolean
  is_senior_member: number
  level_info: PurpleLevelInfo
  mid: string
  nameplate: PurpleNameplate
  nft_interaction: null
  official_verify: PurpleOfficialVerify
  pendant: PurplePendant
  rank: string
  senior: { [key: string]: any }
  sex: string
  sign: string
  uname: string
  user_sailing: PurpleUserSailing
  user_sailing_v2: { [key: string]: any }
  vip: PurpleVip;
  [property: string]: any
}

type PurpleAvatarItem = {
  container_size: PurpleContainerSize
  fallback_layers: PurpleFallbackLayers
  mid: string;
  [property: string]: any
}

type PurpleContainerSize = {
  height: number
  width: number;
  [property: string]: any
}

type PurpleFallbackLayers = {
  is_critical_group: boolean
  layers: PurpleLayer[];
  [property: string]: any
}

type PurpleLayer = {
  general_spec: PurpleGeneralSpec
  layer_config: PurpleLayerConfig
  resource: PurpleResource
  visible: boolean;
  [property: string]: any
}

type PurpleGeneralSpec = {
  pos_spec: PurplePosSpec
  render_spec: PurpleRenderSpec
  size_spec: PurpleSizeSpec;
  [property: string]: any
}

type PurplePosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number;
  [property: string]: any
}

type PurpleRenderSpec = {
  opacity: number;
  [property: string]: any
}

type PurpleSizeSpec = {
  height: number
  width: number ;
  [property: string]: any
}

type PurpleLayerConfig = {
  is_critical: boolean
  tags: PurpleTags;
  [property: string]: any
}

type PurpleTags = {
  AVATAR_LAYER: { [key: string]: any }
  GENERAL_CFG: PurpleGENERALCFG
  ICON_LAYER?: { [key: string]: any };
  [property: string]: any
}

type PurpleGENERALCFG = {
  config_type: number
  general_config: PurpleGeneralConfig;
  [property: string]: any
}

type PurpleGeneralConfig = {
  web_css_style: PurpleWebcssStyle;
  [property: string]: any
}

type PurpleWebcssStyle = {
  'background-color'?: string
  border?: string
  borderRadius: string
  boxSizing?: string;
  [property: string]: any
}

type PurpleResource = {
  res_image: PurpleResImage
  res_type: number;
  [property: string]: any
}

type PurpleResImage = {
  image_src: PurpleImageSrc;
  [property: string]: any
}

type PurpleImageSrc = {
  local?: number
  placeholder: number
  remote: PurpleRemote
  src_type: number;
  [property: string]: any
}

type PurpleRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type PurpleLevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number;
  [property: string]: any
}

type PurpleNameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number;
  [property: string]: any
}

type PurpleOfficialVerify = {
  desc: string
  type: number;
  [property: string]: any
}

type PurplePendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number;
  [property: string]: any
}

type PurpleUserSailing = {
  cardbg: null
  cardbg_with_focus: null
  pendant: null;
  [property: string]: any
}

type PurpleVip = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: PurpleLabel
  nickname_color: string
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number;
  [property: string]: any
}

type PurpleLabel = {
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

type ReplyReply = {
  action: number
  assist: number
  attr: number
  content: FluffyContent
  count: number
  ctime: number
  dialog: number
  dialog_str: string
  dynamic_id_str: string
  fansgrade: number
  folder: FluffyFolder
  invisible: boolean
  like: number
  member: FluffyMember
  mid: number
  mid_str: string
  note_cvid_str: string
  oid: number
  oid_str: string
  parent: number
  parent_str: string
  rcount: number
  replies: null
  reply_control: PurpleReplyControl
  root: number
  root_str: string
  rpid: number
  rpid_str: string
  state: number
  track_info: string
  type: number
  up_action: PurpleUpAction;
  [property: string]: any
}

type FluffyContent = {
  emote?: Emote
  jump_url: { [key: string]: any }
  max_line: number
  members: string[]
  message: string;
  [property: string]: any
}

type Emote = {
  '[呲牙]': 呲牙;
  [property: string]: any
}

type 呲牙 = {
  attr: number
  id: number
  jump_title: string
  meta: Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type FluffyFolder = {
  has_folded: boolean
  is_folded: boolean
  rule: string;
  [property: string]: any
}

type FluffyMember = {
  avatar: string
  avatar_item: FluffyAvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: null
  is_contractor: boolean
  is_senior_member: number
  level_info: FluffyLevelInfo
  mid: string
  nameplate: FluffyNameplate
  nft_interaction: null
  official_verify: FluffyOfficialVerify
  pendant: FluffyPendant
  rank: string
  senior: { [key: string]: any }
  sex: string
  sign: string
  uname: string
  user_sailing: FluffyUserSailing
  user_sailing_v2: { [key: string]: any }
  vip: FluffyVip;
  [property: string]: any
}

type FluffyAvatarItem = {
  container_size: FluffyContainerSize
  fallback_layers: FluffyFallbackLayers
  mid: string;
  [property: string]: any
}

type FluffyContainerSize = {
  height: number
  width: number;
  [property: string]: any
}

type FluffyFallbackLayers = {
  is_critical_group: boolean
  layers: FluffyLayer[];
  [property: string]: any
}

type FluffyLayer = {
  general_spec: FluffyGeneralSpec
  layer_config: FluffyLayerConfig
  resource: FluffyResource
  visible: boolean;
  [property: string]: any
}

type FluffyGeneralSpec = {
  pos_spec: FluffyPosSpec
  render_spec: FluffyRenderSpec
  size_spec: FluffySizeSpec;
  [property: string]: any
}

type FluffyPosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number;
  [property: string]: any
}

type FluffyRenderSpec = {
  opacity: number;
  [property: string]: any
}

type FluffySizeSpec = {
  height: number
  width: number ;
  [property: string]: any
}

type FluffyLayerConfig = {
  is_critical?: boolean
  tags: FluffyTags;
  [property: string]: any
}

type FluffyTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: FluffyGENERALCFG
  ICON_LAYER: { [key: string]: any };
  [property: string]: any
}

type FluffyGENERALCFG = {
  config_type: number
  general_config: FluffyGeneralConfig;
  [property: string]: any
}

type FluffyGeneralConfig = {
  web_css_style: FluffyWebcssStyle;
  [property: string]: any
}

type FluffyWebcssStyle = {
  'background-color': string
  border: string
  borderRadius: string
  boxSizing: string;
  [property: string]: any
}

type FluffyResource = {
  res_image: FluffyResImage
  res_type: number;
  [property: string]: any
}

type FluffyResImage = {
  image_src: FluffyImageSrc;
  [property: string]: any
}

type FluffyImageSrc = {
  local: number
  placeholder?: number
  remote?: FluffyRemote
  src_type: number;
  [property: string]: any
}

type FluffyRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type FluffyLevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number;
  [property: string]: any
}

type FluffyNameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number;
  [property: string]: any
}

type FluffyOfficialVerify = {
  desc: string
  type: number;
  [property: string]: any
}

type FluffyPendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number;
  [property: string]: any
}

type FluffyUserSailing = {
  cardbg: null
  cardbg_with_focus: null
  pendant: null;
  [property: string]: any
}

type FluffyVip = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: FluffyLabel
  nickname_color: string
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number;
  [property: string]: any
}

type FluffyLabel = {
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

type PurpleReplyControl = {
  location: string
  max_line: number
  time_desc: string
  translation_switch: number;
  [property: string]: any
}

type PurpleUpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type FluffyReplyControl = {
  location: string
  max_line: number
  sub_reply_entry_text: string
  sub_reply_title_text: string
  time_desc: string
  translation_switch: number
  up_reply: boolean;
  [property: string]: any
}

type FluffyUpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type Top = {
  admin: null
  upper: TopUpper
  vote: null;
  [property: string]: any
}

type TopUpper = {
  action: number
  assist: number
  attr: number
  content: UpperContent
  count: number
  ctime: number
  dialog: number
  dialog_str: string
  dynamic_id_str: string
  fansgrade: number
  folder: UpperFolder
  invisible: boolean
  like: number
  member: UpperMember
  mid: number
  mid_str: string
  note_cvid_str: string
  oid: number
  oid_str: string
  parent: number
  parent_str: string
  rcount: number
  replies: UpperReply[]
  reply_control: UpperReplyControl
  root: number
  root_str: string
  rpid: number
  rpid_str: string
  state: number
  track_info: string
  type: number
  up_action: UpperUpAction;
  [property: string]: any
}

type UpperContent = {
  jump_url: PurpleJumpurl
  max_line: number
  members: string[]
  message: string;
  [property: string]: any
}

type PurpleJumpurl = {
  'https://b23.tv/mall-31Qhv-71b88': PurplehttpsB23TvMall31Qhv71B88
  'https://b23.tv/mall-31Qhv-72Hhp': PurplehttpsB23TvMall31Qhv72Hhp;
  [property: string]: any
}

type PurplehttpsB23TvMall31Qhv71B88 = {
  app_name: string
  app_package_name: string
  app_url_schema: string
  click_report: string
  exposure_report: string
  extra: PurpleExtra
  icon_position: number
  is_half_screen: boolean
  match_once: boolean
  pc_url: string
  prefix_icon: string
  state: number
  title: string
  underline: boolean;
  [property: string]: any
}

type PurpleExtra = {
  goods_click_report: string
  goods_cm_control: number
  goods_exposure_report: string
  goods_item_id: number
  goods_show_type: number
  is_word_search: boolean;
  [property: string]: any
}

type PurplehttpsB23TvMall31Qhv72Hhp = {
  app_name: string
  app_package_name: string
  app_url_schema: string
  click_report: string
  exposure_report: string
  extra: FluffyExtra
  icon_position: number
  is_half_screen: boolean
  match_once: boolean
  pc_url: string
  prefix_icon: string
  state: number
  title: string
  underline: boolean;
  [property: string]: any
}

type FluffyExtra = {
  goods_click_report: string
  goods_cm_control: number
  goods_exposure_report: string
  goods_item_id: number
  goods_show_type: number
  is_word_search: boolean;
  [property: string]: any
}

type UpperFolder = {
  has_folded: boolean
  is_folded: boolean
  rule: string;
  [property: string]: any
}

type UpperMember = {
  avatar: string
  avatar_item: TentacledAvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: null
  is_contractor: boolean
  is_senior_member: number
  level_info: TentacledLevelInfo
  mid: string
  nameplate: TentacledNameplate
  nft_interaction: null
  official_verify: TentacledOfficialVerify
  pendant: TentacledPendant
  rank: string
  senior: { [key: string]: any }
  sex: string
  sign: string
  uname: string
  user_sailing: TentacledUserSailing
  user_sailing_v2: { [key: string]: any }
  vip: TentacledVip;
  [property: string]: any
}

type TentacledAvatarItem = {
  container_size: TentacledContainerSize
  fallback_layers: TentacledFallbackLayers
  mid: string;
  [property: string]: any
}

type TentacledContainerSize = {
  height: number
  width: number;
  [property: string]: any
}

type TentacledFallbackLayers = {
  is_critical_group: boolean
  layers: TentacledLayer[];
  [property: string]: any
}

type TentacledLayer = {
  general_spec: TentacledGeneralSpec
  layer_config: TentacledLayerConfig
  resource: TentacledResource
  visible: boolean;
  [property: string]: any
}

type TentacledGeneralSpec = {
  pos_spec: TentacledPosSpec
  render_spec: TentacledRenderSpec
  size_spec: TentacledSizeSpec;
  [property: string]: any
}

type TentacledPosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number;
  [property: string]: any
}

type TentacledRenderSpec = {
  opacity: number;
  [property: string]: any
}

type TentacledSizeSpec = {
  height: number
  width: number ;
  [property: string]: any
}

type TentacledLayerConfig = {
  is_critical?: boolean
  tags: TentacledTags;
  [property: string]: any
}

type TentacledTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: TentacledGENERALCFG
  ICON_LAYER: { [key: string]: any };
  [property: string]: any
}

type TentacledGENERALCFG = {
  config_type: number
  general_config: TentacledGeneralConfig;
  [property: string]: any
}

type TentacledGeneralConfig = {
  web_css_style: TentacledWebcssStyle;
  [property: string]: any
}

type TentacledWebcssStyle = {
  'background-color': string
  border: string
  borderRadius: string
  boxSizing: string;
  [property: string]: any
}

type TentacledResource = {
  res_image: TentacledResImage
  res_type: number;
  [property: string]: any
}

type TentacledResImage = {
  image_src: TentacledImageSrc;
  [property: string]: any
}

type TentacledImageSrc = {
  local: number
  placeholder?: number
  remote?: TentacledRemote
  src_type: number;
  [property: string]: any
}

type TentacledRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type TentacledLevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number;
  [property: string]: any
}

type TentacledNameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number;
  [property: string]: any
}

type TentacledOfficialVerify = {
  desc: string
  type: number;
  [property: string]: any
}

type TentacledPendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number;
  [property: string]: any
}

type TentacledUserSailing = {
  cardbg: null
  cardbg_with_focus: null
  pendant: null;
  [property: string]: any
}

type TentacledVip = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: TentacledLabel
  nickname_color: string
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number;
  [property: string]: any
}

type TentacledLabel = {
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

type UpperReply = {
  action?: number
  assist?: number
  attr?: number
  content?: TentacledContent
  count?: number
  ctime?: number
  dialog?: number
  dialog_str?: string
  dynamic_id_str?: string
  fansgrade?: number
  folder?: TentacledFolder
  invisible?: boolean
  like?: number
  member?: TentacledMember
  mid?: number
  mid_str?: string
  note_cvid_str?: string
  oid?: number
  oid_str?: string
  parent?: number
  parent_str?: string
  rcount?: number
  replies?: null
  reply_control?: TentacledReplyControl
  root?: number
  root_str?: string
  rpid?: number
  rpid_str?: string
  state?: number
  track_info?: string
  type?: number
  up_action?: TentacledUpAction;
  [property: string]: any
}

type TentacledContent = {
  jump_url: { [key: string]: any }
  max_line: number
  members: string[]
  message: string;
  [property: string]: any
}

type TentacledFolder = {
  has_folded: boolean
  is_folded: boolean
  rule: string;
  [property: string]: any
}

type TentacledMember = {
  avatar: string
  avatar_item: StickyAvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: null
  is_contractor: boolean
  is_senior_member: number
  level_info: StickyLevelInfo
  mid: string
  nameplate: StickyNameplate
  nft_interaction: null
  official_verify: StickyOfficialVerify
  pendant: StickyPendant
  rank: string
  senior: { [key: string]: any }
  sex: string
  sign: string
  uname: string
  user_sailing: StickyUserSailing
  user_sailing_v2: { [key: string]: any }
  vip: StickyVip;
  [property: string]: any
}

type StickyAvatarItem = {
  container_size: StickyContainerSize
  fallback_layers: StickyFallbackLayers
  mid: string;
  [property: string]: any
}

type StickyContainerSize = {
  height: number
  width: number;
  [property: string]: any
}

type StickyFallbackLayers = {
  is_critical_group: boolean
  layers: StickyLayer[];
  [property: string]: any
}

type StickyLayer = {
  general_spec: StickyGeneralSpec
  layer_config: StickyLayerConfig
  resource: StickyResource
  visible: boolean;
  [property: string]: any
}

type StickyGeneralSpec = {
  pos_spec: StickyPosSpec
  render_spec: StickyRenderSpec
  size_spec: StickySizeSpec;
  [property: string]: any
}

type StickyPosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number;
  [property: string]: any
}

type StickyRenderSpec = {
  opacity: number;
  [property: string]: any
}

type StickySizeSpec = {
  height: number
  width: number ;
  [property: string]: any
}

type StickyLayerConfig = {
  is_critical?: boolean
  tags: StickyTags;
  [property: string]: any
}

type StickyTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: StickyGENERALCFG
  ICON_LAYER: { [key: string]: any };
  [property: string]: any
}

type StickyGENERALCFG = {
  config_type: number
  general_config: StickyGeneralConfig;
  [property: string]: any
}

type StickyGeneralConfig = {
  web_css_style: StickyWebcssStyle;
  [property: string]: any
}

type StickyWebcssStyle = {
  'background-color': string
  border: string
  borderRadius: string
  boxSizing: string;
  [property: string]: any
}

type StickyResource = {
  res_image: StickyResImage
  res_type: number;
  [property: string]: any
}

type StickyResImage = {
  image_src: StickyImageSrc;
  [property: string]: any
}

type StickyImageSrc = {
  local: number
  placeholder?: number
  remote?: StickyRemote
  src_type: number;
  [property: string]: any
}

type StickyRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type StickyLevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number;
  [property: string]: any
}

type StickyNameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number;
  [property: string]: any
}

type StickyOfficialVerify = {
  desc: string
  type: number;
  [property: string]: any
}

type StickyPendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number;
  [property: string]: any
}

type StickyUserSailing = {
  cardbg: null
  cardbg_with_focus: null
  pendant: null;
  [property: string]: any
}

type StickyVip = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: StickyLabel
  nickname_color: string
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number;
  [property: string]: any
}

type StickyLabel = {
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

type TentacledReplyControl = {
  location: string
  max_line: number
  time_desc: string
  translation_switch: number;
  [property: string]: any
}

type TentacledUpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type UpperReplyControl = {
  cm_recommend_component: string
  is_up_top: boolean
  location: string
  max_line: number
  sub_reply_entry_text: string
  sub_reply_title_text: string
  time_desc: string
  translation_switch: number
  up_reply: boolean;
  [property: string]: any
}

type UpperUpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type TopReply = {
  action?: number
  assist?: number
  attr?: number
  content?: TopReplyContent
  count?: number
  ctime?: number
  dialog?: number
  dialog_str?: string
  dynamic_id_str?: string
  fansgrade?: number
  folder?: TopReplyFolder
  invisible?: boolean
  like?: number
  member?: TopReplyMember
  mid?: number
  mid_str?: string
  note_cvid_str?: string
  oid?: number
  oid_str?: string
  parent?: number
  parent_str?: string
  rcount?: number
  replies?: TopReplyReply[]
  reply_control?: TopReplyReplyControl
  root?: number
  root_str?: string
  rpid?: number
  rpid_str?: string
  state?: number
  track_info?: string
  type?: number
  up_action?: TopReplyUpAction;
  [property: string]: any
}

type TopReplyContent = {
  jump_url: FluffyJumpurl
  max_line: number
  members: string[]
  message: string;
  [property: string]: any
}

type FluffyJumpurl = {
  'https://b23.tv/mall-31Qhv-71b88': FluffyhttpsB23TvMall31Qhv71B88
  'https://b23.tv/mall-31Qhv-72Hhp': FluffyhttpsB23TvMall31Qhv72Hhp;
  [property: string]: any
}

type FluffyhttpsB23TvMall31Qhv71B88 = {
  app_name: string
  app_package_name: string
  app_url_schema: string
  click_report: string
  exposure_report: string
  extra: TentacledExtra
  icon_position: number
  is_half_screen: boolean
  match_once: boolean
  pc_url: string
  prefix_icon: string
  state: number
  title: string
  underline: boolean;
  [property: string]: any
}

type TentacledExtra = {
  goods_click_report: string
  goods_cm_control: number
  goods_exposure_report: string
  goods_item_id: number
  goods_show_type: number
  is_word_search: boolean;
  [property: string]: any
}

type FluffyhttpsB23TvMall31Qhv72Hhp = {
  app_name: string
  app_package_name: string
  app_url_schema: string
  click_report: string
  exposure_report: string
  extra: StickyExtra
  icon_position: number
  is_half_screen: boolean
  match_once: boolean
  pc_url: string
  prefix_icon: string
  state: number
  title: string
  underline: boolean;
  [property: string]: any
}

type StickyExtra = {
  goods_click_report: string
  goods_cm_control: number
  goods_exposure_report: string
  goods_item_id: number
  goods_show_type: number
  is_word_search: boolean;
  [property: string]: any
}

type TopReplyFolder = {
  has_folded: boolean
  is_folded: boolean
  rule: string;
  [property: string]: any
}

type TopReplyMember = {
  avatar: string
  avatar_item: IndigoAvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: null
  is_contractor: boolean
  is_senior_member: number
  level_info: IndigoLevelInfo
  mid: string
  nameplate: IndigoNameplate
  nft_interaction: null
  official_verify: IndigoOfficialVerify
  pendant: IndigoPendant
  rank: string
  senior: { [key: string]: any }
  sex: string
  sign: string
  uname: string
  user_sailing: IndigoUserSailing
  user_sailing_v2: { [key: string]: any }
  vip: IndigoVip;
  [property: string]: any
}

type IndigoAvatarItem = {
  container_size: IndigoContainerSize
  fallback_layers: IndigoFallbackLayers
  mid: string;
  [property: string]: any
}

type IndigoContainerSize = {
  height: number
  width: number;
  [property: string]: any
}

type IndigoFallbackLayers = {
  is_critical_group: boolean
  layers: IndigoLayer[];
  [property: string]: any
}

type IndigoLayer = {
  general_spec: IndigoGeneralSpec
  layer_config: IndigoLayerConfig
  resource: IndigoResource
  visible: boolean;
  [property: string]: any
}

type IndigoGeneralSpec = {
  pos_spec: IndigoPosSpec
  render_spec: IndigoRenderSpec
  size_spec: IndigoSizeSpec;
  [property: string]: any
}

type IndigoPosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number;
  [property: string]: any
}

type IndigoRenderSpec = {
  opacity: number;
  [property: string]: any
}

type IndigoSizeSpec = {
  height: number
  width: number ;
  [property: string]: any
}

type IndigoLayerConfig = {
  is_critical?: boolean
  tags: IndigoTags;
  [property: string]: any
}

type IndigoTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: IndigoGENERALCFG
  ICON_LAYER: { [key: string]: any };
  [property: string]: any
}

type IndigoGENERALCFG = {
  config_type: number
  general_config: IndigoGeneralConfig;
  [property: string]: any
}

type IndigoGeneralConfig = {
  web_css_style: IndigoWebcssStyle;
  [property: string]: any
}

type IndigoWebcssStyle = {
  'background-color': string
  border: string
  borderRadius: string
  boxSizing: string;
  [property: string]: any
}

type IndigoResource = {
  res_image: IndigoResImage
  res_type: number;
  [property: string]: any
}

type IndigoResImage = {
  image_src: IndigoImageSrc;
  [property: string]: any
}

type IndigoImageSrc = {
  local: number
  placeholder?: number
  remote?: IndigoRemote
  src_type: number;
  [property: string]: any
}

type IndigoRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type IndigoLevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number;
  [property: string]: any
}

type IndigoNameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number;
  [property: string]: any
}

type IndigoOfficialVerify = {
  desc: string
  type: number;
  [property: string]: any
}

type IndigoPendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number;
  [property: string]: any
}

type IndigoUserSailing = {
  cardbg: null
  cardbg_with_focus: null
  pendant: null;
  [property: string]: any
}

type IndigoVip = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: IndigoLabel
  nickname_color: string
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number;
  [property: string]: any
}

type IndigoLabel = {
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

type TopReplyReply = {
  action?: number
  assist?: number
  attr?: number
  content?: StickyContent
  count?: number
  ctime?: number
  dialog?: number
  dialog_str?: string
  dynamic_id_str?: string
  fansgrade?: number
  folder?: StickyFolder
  invisible?: boolean
  like?: number
  member?: StickyMember
  mid?: number
  mid_str?: string
  note_cvid_str?: string
  oid?: number
  oid_str?: string
  parent?: number
  parent_str?: string
  rcount?: number
  replies?: null
  reply_control?: StickyReplyControl
  root?: number
  root_str?: string
  rpid?: number
  rpid_str?: string
  state?: number
  track_info?: string
  type?: number
  up_action?: StickyUpAction;
  [property: string]: any
}

type StickyContent = {
  jump_url: { [key: string]: any }
  max_line: number
  members: string[]
  message: string;
  [property: string]: any
}

type StickyFolder = {
  has_folded: boolean
  is_folded: boolean
  rule: string;
  [property: string]: any
}

type StickyMember = {
  avatar: string
  avatar_item: IndecentAvatarItem
  contract_desc: string
  face_nft_new: number
  fans_detail: null
  is_contractor: boolean
  is_senior_member: number
  level_info: IndecentLevelInfo
  mid: string
  nameplate: IndecentNameplate
  nft_interaction: null
  official_verify: IndecentOfficialVerify
  pendant: IndecentPendant
  rank: string
  senior: { [key: string]: any }
  sex: string
  sign: string
  uname: string
  user_sailing: IndecentUserSailing
  user_sailing_v2: { [key: string]: any }
  vip: IndecentVip;
  [property: string]: any
}

type IndecentAvatarItem = {
  container_size: IndecentContainerSize
  fallback_layers: IndecentFallbackLayers
  mid: string;
  [property: string]: any
}

type IndecentContainerSize = {
  height: number
  width: number;
  [property: string]: any
}

type IndecentFallbackLayers = {
  is_critical_group: boolean
  layers: IndecentLayer[];
  [property: string]: any
}

type IndecentLayer = {
  general_spec: IndecentGeneralSpec
  layer_config: IndecentLayerConfig
  resource: IndecentResource
  visible: boolean;
  [property: string]: any
}

type IndecentGeneralSpec = {
  pos_spec: IndecentPosSpec
  render_spec: IndecentRenderSpec
  size_spec: IndecentSizeSpec;
  [property: string]: any
}

type IndecentPosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number;
  [property: string]: any
}

type IndecentRenderSpec = {
  opacity: number;
  [property: string]: any
}

type IndecentSizeSpec = {
  height: number
  width: number ;
  [property: string]: any
}

type IndecentLayerConfig = {
  is_critical?: boolean
  tags: IndecentTags;
  [property: string]: any
}

type IndecentTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: IndecentGENERALCFG
  ICON_LAYER: { [key: string]: any };
  [property: string]: any
}

type IndecentGENERALCFG = {
  config_type: number
  general_config: IndecentGeneralConfig;
  [property: string]: any
}

type IndecentGeneralConfig = {
  web_css_style: IndecentWebcssStyle;
  [property: string]: any
}

type IndecentWebcssStyle = {
  'background-color': string
  border: string
  borderRadius: string
  boxSizing: string;
  [property: string]: any
}

type IndecentResource = {
  res_image: IndecentResImage
  res_type: number;
  [property: string]: any
}

type IndecentResImage = {
  image_src: IndecentImageSrc;
  [property: string]: any
}

type IndecentImageSrc = {
  local: number
  placeholder?: number
  remote?: IndecentRemote
  src_type: number;
  [property: string]: any
}

type IndecentRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type IndecentLevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number;
  [property: string]: any
}

type IndecentNameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number;
  [property: string]: any
}

type IndecentOfficialVerify = {
  desc: string
  type: number;
  [property: string]: any
}

type IndecentPendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number;
  [property: string]: any
}

type IndecentUserSailing = {
  cardbg: null
  cardbg_with_focus: null
  pendant: null;
  [property: string]: any
}

type IndecentVip = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: IndecentLabel
  nickname_color: string
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number;
  [property: string]: any
}

type IndecentLabel = {
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

type StickyReplyControl = {
  location: string
  max_line: number
  time_desc: string
  translation_switch: number;
  [property: string]: any
}

type StickyUpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type TopReplyReplyControl = {
  cm_recommend_component: string
  is_up_top: boolean
  location: string
  max_line: number
  sub_reply_entry_text: string
  sub_reply_title_text: string
  time_desc: string
  translation_switch: number
  up_reply: boolean;
  [property: string]: any
}

type TopReplyUpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type DataUpper = {
  mid: number;
  [property: string]: any
}
