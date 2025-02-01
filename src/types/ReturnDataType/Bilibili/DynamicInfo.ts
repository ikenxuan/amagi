export type DynamicInfo = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  item: Item;
  [property: string]: any
}

type Item = {
  basic: Basic
  id_str: string
  modules: Modules
  type: string
  visible: boolean;
  [property: string]: any
}

type Basic = {
  comment_id_str: string
  comment_type: number
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
  decorate: Decorate
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
  vip: Vip;
  [property: string]: any
}

type Avatar = {
  container_size: ContainerSize
  fallback_layers: FallbackLayers
  layers: AvatarLayer[]
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
  layers: FallbackLayersLayer[];
  [property: string]: any
}

type FallbackLayersLayer = {
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
  is_critical?: boolean
  tags: PurpleTags;
  [property: string]: any
}

type PurpleTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: PurpleGENERALCFG
  ICON_LAYER: { [key: string]: any }
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
  'background-color': string
  border: string
  borderRadius: string
  boxSizing: string;
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
  local: number
  placeholder?: number
  remote?: PurpleRemote
  src_type: number;
  [property: string]: any
}

type PurpleRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type AvatarLayer = {
  is_critical_group?: boolean
  layers: LayerLayer[];
  [property: string]: any
}

type LayerLayer = {
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
  res_animation?: ResAnimation
  res_image: FluffyResImage
  res_type: number;
  [property: string]: any
}

type ResAnimation = {
  webp_src: WebpSrc;
  [property: string]: any
}

type WebpSrc = {
  remote: WebpSrcRemote
  src_type: number;
  [property: string]: any
}

type WebpSrcRemote = {
  bfs_style: string
  url: string;
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

type Decorate = {
  card_url: string
  fan: Fan
  id: number
  jump_url: string
  name: string
  type: number;
  [property: string]: any
}

type Fan = {
  color: string
  color_format: ColorFormat
  is_fan: boolean
  num_prefix: string
  num_str: string
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
  additional: Additional
  desc: Desc
  major: Major
  topic: null;
  [property: string]: any
}

type Additional = {
  common: Common
  type: string;
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
  title: string;
  [property: string]: any
}

type Button = {
  jump_style: JumpStyle
  jump_url: string
  type: number;
  [property: string]: any
}

type JumpStyle = {
  icon_url: string
  text: string;
  [property: string]: any
}

type Desc = {
  rich_text_nodes: RichTextNode[]
  text: string;
  [property: string]: any
}

type RichTextNode = {
  jump_url: string
  orig_text: string
  text: string
  type: string;
  [property: string]: any
}

type Major = {
  archive: Archive
  type: string;
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
  type: number;
  [property: string]: any
}

type Badge = {
  bg_color: string
  color: string
  icon_url: null
  text: string;
  [property: string]: any
}

type Stat = {
  danmaku: string
  play: string;
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
