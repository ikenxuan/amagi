// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/dynamicDetail.requests.json 里
//   dynamic_id  视频动态

export type DynamicDetail_V1 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  item: Item
  [property: string]: any
}

type Item = {
  basic: Basic
  id_str: string
  modules: Modules
  type: string
  visible: boolean
  [property: string]: any
}

type Basic = {
  comment_id_str: string
  comment_type: number
  like_icon: LikeIcon
  rid_str: string
  [property: string]: any
}

type LikeIcon = {
  action_url: string
  end_url: string
  id: number
  start_url: string
  [property: string]: any
}

type Modules = {
  module_author: ModuleAuthor
  module_dynamic: ModuleDynamic
  module_more: ModuleMore
  module_stat: ModuleStat
  [property: string]: any
}

type ModuleAuthor = {
  avatar: Avatar
  face: string
  face_nft: boolean
  following: boolean
  jump_url: string
  label: string
  mid: number
  name: string
  official_verify: OfficialVerify
  pendant: Pendant
  pub_action: string
  pub_location_text: string
  pub_time: string
  pub_ts: number
  type: string
  vip: Vip
  [property: string]: any
}

type Avatar = {
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
  tags: Tags
  [property: string]: any
}

type Tags = {
  AVATAR_LAYER?: { [property: string]: any }
  GENERAL_CFG: GENERALCFG
  ICON_LAYER?: { [property: string]: any }
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
  placeholder?: number
  remote?: Remote
  src_type: number
  [property: string]: any
}

type Remote = {
  bfs_style: string
  url: string
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
  avatar_subscript: number
  avatar_subscript_url: string
  due_date: number
  label: Label
  nickname_color: string
  status: number
  theme_type: number
  type: number
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
  additional: Additional
  desc: Desc
  major: Major
  topic: null
  [property: string]: any
}

type Additional = {
  common: Common
  type: string
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
  jump_style: JumpStyle
  jump_url: string
  type: number
  [property: string]: any
}

type JumpStyle = {
  icon_url: string
  text: string
  [property: string]: any
}

type Desc = {
  rich_text_nodes: RichTextNode[]
  text: string
  [property: string]: any
}

type RichTextNode = {
  jump_url?: string
  orig_text: string
  style?: null
  text: string
  type: string
  [property: string]: any
}

type Major = {
  archive: Archive
  type: string
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
  jump_url: string
  stat: Stat
  title: string
  type: number
  [property: string]: any
}

type Badge = {
  bg_color: string
  color: string
  icon_url: null
  text: string
  [property: string]: any
}

type Stat = {
  danmaku: string
  play: string
  [property: string]: any
}

type ModuleMore = {
  three_point_items: ThreePointItem[]
  [property: string]: any
}

type ThreePointItem = {
  label: string
  type: string
  [property: string]: any
}

type ModuleStat = {
  comment: Comment
  forward: Comment
  like: Like
  [property: string]: any
}

type Comment = {
  count: number
  forbidden: boolean
  [property: string]: any
}

type Like = {
  count: number
  forbidden: boolean
  status: boolean
  [property: string]: any
}
