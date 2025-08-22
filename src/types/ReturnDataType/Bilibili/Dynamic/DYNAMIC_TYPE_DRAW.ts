import { DynamicType } from '../DynamicInfo'

export type DynamicTypeDraw = {

  code: number
  data: DataData
  message: string
  ttl: number;
  [property: string]: any
}

type DataData = {
  item: Item;
  [property: string]: any
}

type Item = {
  basic: Basic
  id_str: string
  modules: Modules
  type: DynamicType.DRAW
  visible: boolean;
  [property: string]: any
}

type Basic = {
  comment_id_str: string
  comment_type: number
  jump_url: string
  like_icon: LikeIcon
  rid_str: string;
  [property: string]: any
}

type LikeIcon = {
  action_url: string
  end_url: string
  id: number
  start_url: string;
  [property: string]: any
}

type Modules = {
  module_author: ModuleAuthor
  module_dynamic: ModuleDynamic
  module_more: ModuleMore
  module_stat: ModuleStat;
  [property: string]: any
}

type ModuleAuthor = {
  avatar: Avatar
  decoration_card: DecorationCard
  face: string
  face_nft: boolean
  following: null
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
  vip: Vip;
  [property: string]: any
}

type Avatar = {
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
  is_critical?: boolean
  tags: Tags;
  [property: string]: any
}

type Tags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: GeneralCFG
  ICON_LAYER: { [key: string]: any }
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
  "background-color": string
  border: string
  borderRadius: string
  boxSizing: string;
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
  local: number
  placeholder?: number
  remote?: Remote
  src_type: number;
  [property: string]: any
}

type Remote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type DecorationCard = {
  big_card_url: string
  card_type: number
  card_type_name: string
  card_url: string
  fan: Fan
  id: number
  image_enhance: string
  item_id: number
  jump_url: string
  name: string;
  [property: string]: any
}

type Fan = {
  color: string
  color_format: ColorFormat
  is_fan: number
  name: string
  num_desc: string
  number: number;
  [property: string]: any
}

type ColorFormat = {
  colors: string[]
  end_point: string
  gradients: number[]
  start_point: string;
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
  avatar_subscript: number
  avatar_subscript_url: string
  due_date: number
  label: Label
  nickname_color: string
  status: number
  theme_type: number
  type: number;
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

type ModuleDynamic = {
  additional: null
  desc: null
  major: Major
  topic: Topic;
  [property: string]: any
}

type Major = {
  opus: Opus
  type: string;
  [property: string]: any
}

type Opus = {
  fold_action: string[]
  jump_url: string
  pics: Pic[]
  summary: Summary
  title: null;
  [property: string]: any
}

type Pic = {
  height?: number
  live_url?: null
  size?: number
  url?: string
  width?: number;
  [property: string]: any
}

type Summary = {
  rich_text_nodes: RichTextNode[]
  text: string;
  [property: string]: any
}

type RichTextNode = {
  jump_url?: string
  orig_text: string
  text: string
  type: string;
  [property: string]: any
}

type Topic = {
  id: number
  jump_url: string
  name: string;
  [property: string]: any
}

type ModuleMore = {
  three_point_items: ThreePointItem[];
  [property: string]: any
}

type ThreePointItem = {
  label?: string
  type?: string;
  [property: string]: any
}

type ModuleStat = {
  comment: Comment
  forward: Forward
  like: Like;
  [property: string]: any
}

type Comment = {
  count: number
  forbidden: boolean;
  [property: string]: any
}

type Forward = {
  count: number
  forbidden: boolean;
  [property: string]: any
}

type Like = {
  count: number
  forbidden: boolean
  status: boolean;
  [property: string]: any
}