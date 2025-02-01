export type WorkComments = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  assist: number
  blacklist: number
  config: Config
  control: Control
  folder: DataFolder
  mode: number
  page: Page
  replies: DataReply[]
  support_mode: number[]
  top: null
  upper: Upper
  vote: number;
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

type DataFolder = {
  has_folded: boolean
  is_folded: boolean
  rule: string;
  [property: string]: any
}

type Page = {
  acount: number
  count: number
  num: number
  size: number;
  [property: string]: any
}

type DataReply = {
  action: number
  assist: number
  attr: number
  card_label?: CardLabel[]
  content: PurpleContent
  count: number
  ctime: number
  dialog: number
  dialog_str: string
  dynamic_id: number
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

type CardLabel = {
  background?: string
  background_height?: number
  background_width?: number
  effect?: number
  effect_start_time?: number
  image?: string
  jump_url?: string
  label_color_day?: string
  label_color_night?: string
  rpid?: number
  text_color_day?: string
  text_color_night?: string
  text_content?: string
  type?: number;
  [property: string]: any
}

type PurpleContent = {
  emote?: PurpleEmote
  jump_url: Jumpurl
  max_line: number
  members: string[]
  message: string
  picture_scale?: number
  pictures?: Picture[];
  [property: string]: any
}

type PurpleEmote = {
  '[doge]'?: PurpleDoge
  '[吃瓜]'?: 吃瓜
  '[哦呼]'?: 哦呼
  '[喜极而泣]'?: Purple喜极而泣
  '[嗑瓜子]'?: 嗑瓜子
  '[星星眼]'?: 星星眼
  '[滑稽]'?: 滑稽
  '[给心心]'?: Purple给心心
  '[脱单doge]': Purple脱单Doge;
  [property: string]: any
}

type PurpleDoge = {
  attr: number
  id: number
  jump_title: string
  meta: PurpleMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type PurpleMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 吃瓜 = {
  attr: number
  id: number
  jump_title: string
  meta: 吃瓜_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 吃瓜_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 哦呼 = {
  attr: number
  id: number
  jump_title: string
  meta: 哦呼_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 哦呼_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type Purple喜极而泣 = {
  attr: number
  id: number
  jump_title: string
  meta: FluffyMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type FluffyMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 嗑瓜子 = {
  attr: number
  id: number
  jump_title: string
  meta: 嗑瓜子_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 嗑瓜子_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 星星眼 = {
  attr: number
  id: number
  jump_title: string
  meta: 星星眼_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 星星眼_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 滑稽 = {
  attr: number
  id: number
  jump_title: string
  meta: 滑稽_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 滑稽_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type Purple给心心 = {
  attr: number
  id: number
  jump_title: string
  meta: TentacledMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type TentacledMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type Purple脱单Doge = {
  attr: number
  id: number
  jump_title: string
  meta: StickyMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type StickyMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type Jumpurl = {
  一一风荷举: 一一风荷举
  燎沉香: 燎沉香;
  [property: string]: any
}

type 一一风荷举 = {
  app_name: string
  app_package_name: string
  app_url_schema: string
  click_report: string
  exposure_report: string
  extra: 一一风荷举_Extra
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

type 一一风荷举_Extra = {
  goods_click_report: string
  goods_cm_control: number
  goods_exposure_report: string
  goods_show_type: number
  is_word_search: boolean;
  [property: string]: any
}

type 燎沉香 = {
  app_name: string
  app_package_name: string
  app_url_schema: string
  click_report: string
  exposure_report: string
  extra: 燎沉香_Extra
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

type 燎沉香_Extra = {
  goods_click_report: string
  goods_cm_control: number
  goods_exposure_report: string
  goods_show_type: number
  is_word_search: boolean;
  [property: string]: any
}

type Picture = {
  img_height: number
  img_size: number
  img_src: string
  img_width: number
  play_gif_thumbnail: boolean
  top_right_icon: string;
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
  fans_detail: null | FansDetail
  is_contractor: boolean
  is_senior_member: number
  level_info: PurpleLevelInfo
  mid: string
  nameplate: PurpleNameplate
  nft_interaction: null | NftInteraction
  official_verify: PurpleOfficialVerify
  pendant: PurplePendant
  rank: string
  senior: PurpleSenior
  sex: string
  sign: string
  uname: string
  user_sailing: UserSailing
  user_sailing_v2: UserSailingV2
  vip: PurpleVip;
  [property: string]: any
}

type PurpleAvatarItem = {
  container_size: PurpleContainerSize
  fallback_layers: PurpleFallbackLayers
  layers?: FluffyLayer[]
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
  width: number;
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
  ICON_LAYER?: { [key: string]: any }
  PENDENT_LAYER?: { [key: string]: any };
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
  res_animation?: PurpleResAnimation
  res_image: PurpleResImage
  res_type: number;
  [property: string]: any
}

type PurpleResAnimation = {
  webp_src: PurpleWebpSrc;
  [property: string]: any
}

type PurpleWebpSrc = {
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

type PurpleResImage = {
  image_src: PurpleImageSrc;
  [property: string]: any
}

type PurpleImageSrc = {
  local?: number
  placeholder: number
  remote: FluffyRemote
  src_type: number;
  [property: string]: any
}

type FluffyRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type FluffyLayer = {
  is_critical_group: boolean
  layers: TentacledLayer[];
  [property: string]: any
}

type TentacledLayer = {
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
  width: number;
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
  ICON_LAYER: { [key: string]: any }
  PENDENT_LAYER?: { [key: string]: any };
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
  res_animation?: FluffyResAnimation
  res_image: FluffyResImage
  res_type: number;
  [property: string]: any
}

type FluffyResAnimation = {
  webp_src: FluffyWebpSrc;
  [property: string]: any
}

type FluffyWebpSrc = {
  remote: TentacledRemote
  src_type: number;
  [property: string]: any
}

type TentacledRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type FluffyResImage = {
  image_src: FluffyImageSrc;
  [property: string]: any
}

type FluffyImageSrc = {
  placeholder: number
  remote: StickyRemote
  src_type: number;
  [property: string]: any
}

type StickyRemote = {
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

type NftInteraction = {
  region: Region;
  [property: string]: any
}

type Region = {
  icon: string
  show_status: number
  type: number;
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

type PurpleSenior = {
  status: number;
  [property: string]: any
}

type UserSailing = {
  cardbg: null | Cardbg
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
  pendant: UserSailingV2Pendant;
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
  name: string
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
  image_enhance_frame: string
  name: string
  type: string;
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
  at_name_to_mid?: AtNameToMid
  at_name_to_mid_str?: AtNameToMidStr
  emote?: FluffyEmote
  jump_url: { [key: string]: any }
  max_line: number
  members: MemberElement[]
  message: string
  topics_meta?: TopicsMeta;
  [property: string]: any
}

type AtNameToMid = {
  gowara?: number
  大吉的顶焦度计: number
  新乃夜?: number
  无氵硫酸铜?: number
  砂之祈愿?: number;
  [property: string]: any
}

type AtNameToMidStr = {
  gowara?: string
  大吉的顶焦度计: string
  新乃夜?: string
  无氵硫酸铜?: string
  砂之祈愿?: string;
  [property: string]: any
}

type FluffyEmote = {
  '[doge]'?: FluffyDoge
  '[保卫萝卜_笔芯]'?: 保卫萝卜_笔芯
  '[初音未来_大笑]'?: 初音未来_大笑
  '[喜极而泣]'?: Fluffy喜极而泣
  '[妙啊]'?: 妙啊
  '[崩坏：星穹铁道_震惊]'?: 崩坏星穹铁道_震惊
  '[思考]'?: 思考
  '[惊讶]'?: 惊讶
  '[打call]'?: 打Call
  '[笑哭]'?: 笑哭
  '[给心心]'?: Fluffy给心心
  '[胜利]'?: 胜利
  '[脱单doge]': Fluffy脱单Doge
  '[脸红]'?: 脸红;
  [property: string]: any
}

type FluffyDoge = {
  attr: number
  id: number
  jump_title: string
  meta: IndigoMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type IndigoMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 保卫萝卜_笔芯 = {
  attr: number
  id: number
  jump_title: string
  meta: 保卫萝卜_笔芯_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 保卫萝卜_笔芯_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 初音未来_大笑 = {
  attr: number
  id: number
  jump_title: string
  meta: 初音未来_大笑_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 初音未来_大笑_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type Fluffy喜极而泣 = {
  attr: number
  id: number
  jump_title: string
  meta: IndecentMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type IndecentMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 妙啊 = {
  attr: number
  id: number
  jump_title: string
  meta: 妙啊_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 妙啊_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 崩坏星穹铁道_震惊 = {
  attr: number
  id: number
  jump_title: string
  meta: 崩坏星穹铁道_震惊_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 崩坏星穹铁道_震惊_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 思考 = {
  attr: number
  id: number
  jump_title: string
  meta: 思考_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 思考_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 惊讶 = {
  attr: number
  id: number
  jump_title: string
  meta: 惊讶_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 惊讶_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 打Call = {
  attr: number
  id: number
  jump_title: string
  meta: 打CallMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 打CallMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 笑哭 = {
  attr: number
  id: number
  jump_title: string
  meta: 笑哭_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 笑哭_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type Fluffy给心心 = {
  attr: number
  id: number
  jump_title: string
  meta: HilariousMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type HilariousMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 胜利 = {
  attr: number
  id: number
  jump_title: string
  meta: 胜利_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 胜利_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type Fluffy脱单Doge = {
  attr: number
  id: number
  jump_title: string
  meta: AmbitiousMeta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type AmbitiousMeta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type 脸红 = {
  attr: number
  id: number
  jump_title: string
  meta: 脸红_Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type 脸红_Meta = {
  size: number
  suggest: string[];
  [property: string]: any
}

type MemberElement = {
  avatar: string
  face_nft_new: number
  is_senior_member: number
  level_info: FluffyLevelInfo
  mid: string
  nameplate: FluffyNameplate
  official_verify: FluffyOfficialVerify
  pendant: FluffyPendant
  rank: string
  senior: { [key: string]: any }
  sex: string
  sign: string
  uname: string
  vip: FluffyVip;
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

type TopicsMeta = {
  '34;完全治龙&': The34完全治龙;
  [property: string]: any
}

type The34完全治龙 = {
  uri: string;
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
  level_info: TentacledLevelInfo
  mid: string
  nameplate: TentacledNameplate
  nft_interaction: null
  official_verify: TentacledOfficialVerify
  pendant: TentacledPendant
  rank: string
  senior: FluffySenior
  sex: string
  sign: string
  uname: string
  user_sailing: null
  vip: TentacledVip;
  [property: string]: any
}

type FluffyAvatarItem = {
  container_size: FluffyContainerSize
  fallback_layers: FluffyFallbackLayers
  layers?: IndigoLayer[]
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
  layers: StickyLayer[];
  [property: string]: any
}

type StickyLayer = {
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
  width: number;
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
  ICON_LAYER: { [key: string]: any }
  PENDENT_LAYER?: { [key: string]: any };
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
  placeholder: number
  remote: IndigoRemote
  src_type: number;
  [property: string]: any
}

type IndigoRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type IndigoLayer = {
  is_critical_group: boolean
  layers: IndecentLayer[];
  [property: string]: any
}

type IndecentLayer = {
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
  width: number;
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
  ICON_LAYER: { [key: string]: any }
  PENDENT_LAYER?: { [key: string]: any };
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
  res_animation?: TentacledResAnimation
  res_image: StickyResImage
  res_type: number;
  [property: string]: any
}

type TentacledResAnimation = {
  webp_src: TentacledWebpSrc;
  [property: string]: any
}

type TentacledWebpSrc = {
  remote: IndecentRemote
  src_type: number;
  [property: string]: any
}

type IndecentRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type StickyResImage = {
  image_src: StickyImageSrc;
  [property: string]: any
}

type StickyImageSrc = {
  placeholder: number
  remote: HilariousRemote
  src_type: number;
  [property: string]: any
}

type HilariousRemote = {
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

type FluffySenior = {
  status: number;
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

type PurpleReplyControl = {
  location: string
  max_line: number
  time_desc: string;
  [property: string]: any
}

type PurpleUpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type FluffyReplyControl = {
  biz_scene?: string
  following?: boolean
  is_note_v2?: boolean
  location: string
  max_line: number
  sub_reply_entry_text: string
  sub_reply_title_text: string
  time_desc: string;
  [property: string]: any
}

type FluffyUpAction = {
  like: boolean
  reply: boolean;
  [property: string]: any
}

type Upper = {
  mid: number
  top: null
  vote: null;
  [property: string]: any
}
