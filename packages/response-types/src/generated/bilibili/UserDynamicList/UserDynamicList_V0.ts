// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/userDynamicList.requests.json 里
//   host_mid  变体0

export type UserDynamicList_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  has_more: boolean
  items: Item[]
  offset: string
  total: string
  update_baseline: string
  update_num: string
  [property: string]: any
}

type Item = {
  basic: Basic
  id_str: string
  modules: Modules
  orig: Orig | null
  type: string
  visible: boolean
  [property: string]: any
}

type Basic = {
  aigc: boolean
  comment_id_str: string
  comment_type: number
  editable: boolean
  in_audit: boolean
  is_only_fans: boolean
  jump_url: string
  like_icon: LikeIcon
  open_app_extra: string
  rid_str: string
  [property: string]: any
}

type LikeIcon = {
  action_url: string
  end_url: string
  id: string
  start_url: string
  [property: string]: any
}

type Modules = {
  module_author: ModuleAuthor
  module_dispute: null
  module_dynamic: ModuleDynamic
  module_extend: null
  module_fold: null
  module_interaction: ModuleInteraction | null
  module_more: ModuleMore
  module_share_info: null
  module_stat: ModuleStat
  module_tag: ModuleTag | null
  [property: string]: any
}

type ModuleAuthor = {
  avatar: Avatar
  decorate: null
  decorate_card: DecorateCard
  decoration_card: DecorateCard
  face: string
  face_nft: boolean
  following: number
  icon_badge: null
  is_top: boolean
  jump_url: string
  label: string
  mid: number
  more: null
  name: string
  name_render: null
  nft_info: null
  official: null
  official_verify: OfficialVerify
  pendant: Pendant
  pub_action: string
  pub_location_text: string
  pub_time: string
  pub_ts: string
  type: string
  views_text: string
  vip: Vip
  [property: string]: any
}

type Avatar = {
  container_size: ContainerSize
  fallback_layers: FallbackLayers
  layers: Layer2[]
  mid: string
  [property: string]: any
}

type ContainerSize = {
  height: number
  width: number
  [property: string]: any
}

type FallbackLayers = {
  group_id: string
  group_mask: null
  is_critical_group: boolean
  layers: Layer[]
  [property: string]: any
}

type Layer = {
  general_spec: GeneralSpec
  layer_config: LayerConfig
  layer_id: string
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
  allow_over_paint: boolean
  is_critical: boolean
  layer_mask: null
  tags: Tags
  [property: string]: any
}

type Tags = {
  AVATAR_LAYER?: AVATARLAYER
  GENERAL_CFG?: GENERALCFG
  ICON_LAYER?: AVATARLAYER
  PENDENT_LAYER?: AVATARLAYER
  [property: string]: any
}

type AVATARLAYER = {
  config_type: number
  [property: string]: any
}

type GENERALCFG = {
  config_type: number
  general_config: GeneralConfig
  [property: string]: any
}

type GeneralConfig = {
  web_css_style: WebCssStyle
  [property: string]: any
}

type WebCssStyle = {
  'background-color'?: string
  border?: string
  borderRadius: string
  boxSizing?: string
  [property: string]: any
}

type Resource = {
  res_image: ResImage
  res_type: number
  [property: string]: any
}

type ResImage = {
  image_src: ImageSrc
  [property: string]: any
}

type ImageSrc = {
  local?: number
  placeholder: number
  remote?: Remote
  src_type: number
  [property: string]: any
}

type Remote = {
  bfs_style: string
  url: string
  [property: string]: any
}

type Layer2 = {
  group_id: string
  group_mask: null
  is_critical_group: boolean
  layers: Layer3[]
  [property: string]: any
}

type Layer3 = {
  general_spec: GeneralSpec
  layer_config: LayerConfig
  layer_id: string
  resource: Resource2
  visible: boolean
  [property: string]: any
}

type Resource2 = {
  res_animation?: ResAnimation
  res_image?: ResImage
  res_type: number
  [property: string]: any
}

type ResAnimation = {
  webp_src: WebpSrc
  [property: string]: any
}

type WebpSrc = {
  placeholder: number
  remote: Remote
  src_type: number
  [property: string]: any
}

type DecorateCard = {
  big_card_url: string
  card_type: string
  card_type_name: string
  card_url: string
  expire_time: string
  fan: Fan
  id: string
  image_enhance: string
  image_group: null
  item_id: string
  jump_url: string
  name: string
  [property: string]: any
}

type Fan = {
  color: string
  color_format: ColorFormat
  is_fan: string
  name: string
  num_desc: string
  num_prefix: string
  number: string
  [property: string]: any
}

type ColorFormat = {
  colors: string[]
  end_point: string
  gradients: string[]
  start_point: string
  [property: string]: any
}

type OfficialVerify = {
  desc: string
  type: number
  [property: string]: any
}

type Pendant = {
  expire: string
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: string
  name: string
  pid: number
  [property: string]: any
}

type Vip = {
  avatar_icon: AvatarIcon
  avatar_subscript: number
  avatar_subscript_url: string
  due_date: string
  label: Label
  nickname_color: string
  role: string
  status: number
  theme_type: number
  tv_due_date: string
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
  label_theme: string
  path: string
  text: string
  text_color: string
  use_img_label: boolean
  [property: string]: any
}

type ModuleDynamic = {
  additional: Additional | null
  desc: Desc | null
  major: Major | null
  topic: null
  [property: string]: any
}

type Additional = {
  common: Common | null
  goods: null
  match: null
  reserve: Reserve | null
  type: string
  ugc: null
  upower_lottery: null
  vote: null
  [property: string]: any
}

type Common = {
  button: Button
  cover: string
  desc1: string
  desc2: string
  head_text: string
  id_str: string
  jump_url: string
  style: number
  sub_type: string
  title: string
  [property: string]: any
}

type Button = {
  check: null
  click_type: number
  jump_style: JumpStyle
  jump_url: string
  status: number
  type: number
  uncheck: null
  [property: string]: any
}

type JumpStyle = {
  bg_style: number
  disable: number
  icon_url: string
  interactive: null
  text: string
  toast: string
  [property: string]: any
}

type Reserve = {
  badge_text: string
  button: Button2
  desc1: Desc1
  desc2: Desc1
  desc3: null
  jump_url: string
  premiere: null
  reserve_total: number
  rid: number
  state: number
  stype: number
  title: string
  up_mid: string
  [property: string]: any
}

type Button2 = {
  check: JumpStyle
  click_type: number
  jump_style: null
  jump_url: string
  status: number
  type: number
  uncheck: JumpStyle
  [property: string]: any
}

type Desc1 = {
  icon_url: string
  jump_url: string
  style: number
  text: string
  visible: boolean
  [property: string]: any
}

type Desc = {
  has_more: boolean
  paragraphs: unknown[]
  rich_text_nodes: RichTextNode[]
  text: string
  [property: string]: any
}

type RichTextNode = {
  emoji: null
  goods: null
  icon_name: string
  icon_url: string
  jump_url: string
  orig_text: string
  pics: unknown[]
  rid: string
  style: null
  text: string
  type: string
  video: null
  [property: string]: any
}

type Major = {
  archive: Archive | null
  article: null
  blocked: null
  common: null
  courses: null
  draw: null
  live: null
  live_rcmd: null
  medialist: null
  music: null
  none: null
  opus: Opus | null
  pgc: null
  subscription: null
  subscription_new: null
  type: string
  ugc_season: null
  upower_common: null
  [property: string]: any
}

type Archive = {
  aid: string
  badge: Badge
  bvid: string
  cover: string
  desc: string
  disable_preview: number
  duration_text: string
  enable_vt: number
  jump_url: string
  premiere_online: string
  stat: Stat
  stat_hidden: number
  title: string
  type: number
  [property: string]: any
}

type Badge = {
  bg_color: string
  color: string
  icon_url: string
  text: string
  [property: string]: any
}

type Stat = {
  danmaku: string
  play: string
  vt: string
  [property: string]: any
}

type Opus = {
  fold_action: string[]
  jump_url: string
  paywall: null
  pics: Pic[]
  style: number
  summary: Summary
  title: string
  [property: string]: any
}

type Pic = {
  aigc: number
  height: number
  live_url: string
  size: number
  url: string
  warning: null
  width: number
  [property: string]: any
}

type Summary = {
  has_more: boolean
  paragraphs: unknown[]
  rich_text_nodes: RichTextNode2[]
  text: string
  [property: string]: any
}

type RichTextNode2 = {
  emoji: null
  goods: null
  icon_name: string
  icon_url: string
  jump_url: string
  orig_text: string
  pics: unknown[]
  rid: string
  style: Style | null
  text: string
  type: string
  video: null
  [property: string]: any
}

type Style = {
  background: string
  bold: boolean
  color: string
  font_level: string
  font_size: number
  italic: boolean
  strikethrough: boolean
  underline: boolean
  [property: string]: any
}

type ModuleInteraction = {
  items: Item2[]
  [property: string]: any
}

type Item2 = {
  desc: Desc2
  type: number
  [property: string]: any
}

type Desc2 = {
  has_more: boolean
  paragraphs: unknown[]
  rich_text_nodes: RichTextNode3[]
  text: string
  [property: string]: any
}

type RichTextNode3 = {
  emoji: Emoji | null
  goods: null
  icon_name: string
  icon_url: string
  jump_url: string
  orig_text: string
  pics: unknown[]
  rid: string
  style: null
  text: string
  type: string
  video: null
  [property: string]: any
}

type Emoji = {
  gif_url: string
  icon_url: string
  id: string
  jump_title: string
  jump_url: string
  package_id: string
  size: number
  text: string
  type: string
  webp_url: string
  [property: string]: any
}

type ModuleMore = {
  rcmd_text: string
  three_point_items: ThreePointItem[]
  [property: string]: any
}

type ThreePointItem = {
  jump_url: string
  label: string
  modal: null
  params: { [property: string]: any }
  type: string
  [property: string]: any
}

type ModuleStat = {
  coin: null
  comment: Comment
  favorite: null
  forward: Comment
  like: Comment
  [property: string]: any
}

type Comment = {
  count: number
  disabled: boolean
  forbidden: boolean
  hidden: boolean
  silent: boolean
  status: boolean
  [property: string]: any
}

type ModuleTag = {
  text: string
  [property: string]: any
}

type Orig = {
  basic: Basic2
  id_str: string
  modules: Modules2
  orig: null
  type: string
  visible: boolean
  [property: string]: any
}

type Basic2 = {
  aigc: boolean
  comment_id_str: string
  comment_type: number
  editable: boolean
  in_audit: boolean
  is_only_fans: boolean
  jump_url: string
  like_icon: null
  open_app_extra: string
  rid_str: string
  [property: string]: any
}

type Modules2 = {
  module_author: ModuleAuthor2
  module_dispute: null
  module_dynamic: ModuleDynamic2
  module_extend: null
  module_fold: null
  module_interaction: null
  module_more: null
  module_share_info: null
  module_stat: null
  module_tag: null
  [property: string]: any
}

type ModuleAuthor2 = {
  avatar: Avatar
  decorate: null
  decorate_card: DecorateCard | null
  decoration_card: DecorateCard | null
  face: string
  face_nft: boolean
  following: number
  icon_badge: null
  is_top: boolean
  jump_url: string
  label: string
  mid: number
  more: null
  name: string
  name_render: null
  nft_info: null
  official: null
  official_verify: OfficialVerify
  pendant: Pendant
  pub_action: string
  pub_location_text: string
  pub_time: string
  pub_ts: string
  type: string
  views_text: string
  vip: Vip
  [property: string]: any
}

type ModuleDynamic2 = {
  additional: Additional2 | null
  desc: Desc | null
  major: Major2
  topic: null
  [property: string]: any
}

type Additional2 = {
  common: Common
  goods: null
  match: null
  reserve: null
  type: string
  ugc: null
  upower_lottery: null
  vote: null
  [property: string]: any
}

type Major2 = {
  archive: Archive | null
  article: null
  blocked: null
  common: null
  courses: null
  draw: null
  live: null
  live_rcmd: null
  medialist: null
  music: null
  none: null
  opus: Opus2 | null
  pgc: null
  subscription: null
  subscription_new: null
  type: string
  ugc_season: null
  upower_common: null
  [property: string]: any
}

type Opus2 = {
  fold_action: string[]
  jump_url: string
  paywall: null
  pics: Pic[]
  style: number
  summary: Desc
  title: string
  [property: string]: any
}
