// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：3 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/dynamicDetail.requests.json 里
//   dynamic_id  图文动态
//   dynamic_id  视频动态
//   dynamic_id  转发动态
//
// 本文件是判别联合的一支：`data.item.type === 'DYNAMIC_TYPE_DRAW'`，形状序号 0。
// 要收窄用同端点 `guards.ts` 里的 `isDynamicTypeDraw`（它收窄整个信封）；只读这一支内部字段的话，裸 `if` / `switch` 判断判别字段同样收窄 —— 收窄的是判别字段所在的那个对象、不是信封，见 core 的 dynamic-detail-union.test-d.ts。

export type DynamicTypeDraw_V0 = {
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
  type: 'DYNAMIC_TYPE_DRAW'
  visible: boolean
  [property: string]: any
}

type Basic = {
  comment_id_str: string
  comment_type: number
  jump_url: string
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
  desc: null
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

type Major = {
  opus: Opus
  type: string
  [property: string]: any
}

type Opus = {
  fold_action: string[]
  jump_url: string
  pics: Pic[]
  summary: Summary
  title: null
  [property: string]: any
}

type Pic = {
  aigc: null
  height: number
  live_url: null
  size: number
  url: string
  width: number
  [property: string]: any
}

type Summary = {
  rich_text_nodes: RichTextNode[]
  text: string
  [property: string]: any
}

type RichTextNode = {
  jump_url?: string
  orig_text: string
  style?: Style
  text: string
  type: string
  [property: string]: any
}

type Style = {
  font_level?: string
  font_size?: number
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
