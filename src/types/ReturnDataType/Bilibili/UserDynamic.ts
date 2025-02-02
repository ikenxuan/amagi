export type UserDynamic = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  has_more: boolean
  items: DataItem[]
  offset: string
  update_baseline: string
  update_num: number;
  [property: string]: any
}

type DataItem = {
  basic: ItemBasic
  id_str: string
  modules: ItemModules
  orig: Orig
  type: string
  visible: boolean;
  [property: string]: any
}

type ItemBasic = {
  comment_id_str: string
  comment_type: number
  like_icon: PurpleLikeIcon
  rid_str: string;
  [property: string]: any
}

type PurpleLikeIcon = {
  action_url: string
  end_url: string
  id: number
  start_url: string;
  [property: string]: any
}

type ItemModules = {
  module_author: PurpleModuleAuthor
  module_dynamic: PurpleModuleDynamic
  module_interaction: ModuleInteraction
  module_more: ModuleMore
  module_stat: ModuleStat
  module_tag?: ModuleTag;
  [property: string]: any
}

type PurpleModuleAuthor = {
  avatar: PurpleAvatar
  decorate: PurpleDecorate
  face: string
  face_nft: boolean
  following: boolean
  jump_url: string
  label: string
  mid: number
  name: string
  official_verify: PurpleOfficialVerify
  pendant: PurplePendant
  pub_action: string
  pub_location_text: string
  pub_time: string
  pub_ts: number
  type: string
  vip: PurpleVip;
  [property: string]: any
}

type PurpleAvatar = {
  container_size: PurpleContainerSize
  fallback_layers: PurpleFallbackLayers
  layers: FluffyLayer[]
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
  res_animation?: PurpleResAnimation
  res_image: FluffyResImage
  res_type: number;
  [property: string]: any
}

type PurpleResAnimation = {
  webp_src: PurpleWebpSrc;
  [property: string]: any
}

type PurpleWebpSrc = {
  remote: FluffyRemote
  src_type: number;
  [property: string]: any
}

type FluffyRemote = {
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
  remote?: TentacledRemote
  src_type: number;
  [property: string]: any
}

type TentacledRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type PurpleDecorate = {
  card_url: string
  fan: PurpleFan
  id: number
  jump_url: string
  name: string
  type: number;
  [property: string]: any
}

type PurpleFan = {
  color: string
  color_format: PurpleColorFormat
  is_fan: boolean
  num_prefix: string
  num_str: string
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

type PurpleVip = {
  avatar_subscript: number
  avatar_subscript_url: string
  due_date: number
  label: PurpleLabel
  nickname_color: string
  status: number
  theme_type: number
  type: number;
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

type PurpleModuleDynamic = {
  additional: null | AdditionalAdditional
  desc: PurpleDesc
  major: null | MajorMajor
  topic: null;
  [property: string]: any
}

type AdditionalAdditional = {
  common: PurpleCommon
  type: string;
  [property: string]: any
}

type PurpleCommon = {
  button: PurpleButton
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

type PurpleButton = {
  jump_style: PurpleJumpStyle
  jump_url: string
  type: number;
  [property: string]: any
}

type PurpleJumpStyle = {
  icon_url: string
  text: string;
  [property: string]: any
}

type PurpleDesc = {
  rich_text_nodes: PurpleRichTextNode[]
  text: string;
  [property: string]: any
}

type PurpleRichTextNode = {
  jump_url: string
  orig_text: string
  rid: string
  style: null
  text: string
  type: string;
  [property: string]: any
}

type MajorMajor = {
  archive?: Archive
  draw: PurpleDraw
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

type PurpleDraw = {
  id: number
  items: PurpleItem[];
  [property: string]: any
}

type PurpleItem = {
  height: number
  size: number
  src: string
  tags: any[]
  width: number;
  [property: string]: any
}

type ModuleInteraction = {
  items: ModuleInteractionItem[];
  [property: string]: any
}

type ModuleInteractionItem = {
  desc: ItemDesc
  type: number;
  [property: string]: any
}

type ItemDesc = {
  rich_text_nodes: FluffyRichTextNode[]
  text: string;
  [property: string]: any
}

type FluffyRichTextNode = {
  emoji: Emoji
  orig_text: string
  rid: string
  text: string
  type: string;
  [property: string]: any
}

type Emoji = {
  icon_url: string
  size: number
  text: string
  type: number;
  [property: string]: any
}

type ModuleMore = {
  three_point_items: ThreePointItem[];
  [property: string]: any
}

type ThreePointItem = {
  label: string
  type: string;
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

type ModuleTag = {
  text: string;
  [property: string]: any
}

type Orig = {
  basic: OrigBasic
  id_str: string
  modules: OrigModules
  type: string
  visible: boolean;
  [property: string]: any
}

type OrigBasic = {
  comment_id_str: string
  comment_type: number
  like_icon: FluffyLikeIcon
  rid_str: string;
  [property: string]: any
}

type FluffyLikeIcon = {
  action_url: string
  end_url: string
  id: number
  start_url: string;
  [property: string]: any
}

type OrigModules = {
  module_author: FluffyModuleAuthor
  module_dynamic: FluffyModuleDynamic;
  [property: string]: any
}

type FluffyModuleAuthor = {
  avatar: FluffyAvatar
  decorate: FluffyDecorate
  face: string
  face_nft: boolean
  following: boolean
  jump_url: string
  label: string
  mid: number
  name: string
  official_verify: FluffyOfficialVerify
  pendant: FluffyPendant
  pub_action: string
  pub_time: string
  pub_ts: number
  type: string
  vip: FluffyVip;
  [property: string]: any
}

type FluffyAvatar = {
  container_size: FluffyContainerSize
  fallback_layers: FluffyFallbackLayers
  layers: IndigoLayer[]
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
  res_animation?: FluffyResAnimation
  res_image: StickyResImage
  res_type: number;
  [property: string]: any
}

type FluffyResAnimation = {
  webp_src: FluffyWebpSrc;
  [property: string]: any
}

type FluffyWebpSrc = {
  remote: IndigoRemote
  src_type: number;
  [property: string]: any
}

type IndigoRemote = {
  bfs_style: string
  url: string;
  [property: string]: any
}

type StickyResImage = {
  image_src: StickyImageSrc;
  [property: string]: any
}

type StickyImageSrc = {
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

type FluffyDecorate = {
  card_url: string
  fan: FluffyFan
  id: number
  jump_url: string
  name: string
  type: number;
  [property: string]: any
}

type FluffyFan = {
  color: string
  color_format: FluffyColorFormat
  is_fan: boolean
  num_prefix: string
  num_str: string
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
  avatar_subscript: number
  avatar_subscript_url: string
  due_date: number
  label: FluffyLabel
  nickname_color: string
  status: number
  theme_type: number
  type: number;
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

type FluffyModuleDynamic = {
  additional: ModuleDynamicAdditional
  desc: FluffyDesc
  major: ModuleDynamicMajor
  topic: null;
  [property: string]: any
}

type ModuleDynamicAdditional = {
  common: FluffyCommon
  type: string;
  [property: string]: any
}

type FluffyCommon = {
  button: FluffyButton
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

type FluffyButton = {
  jump_style: FluffyJumpStyle
  jump_url: string
  type: number;
  [property: string]: any
}

type FluffyJumpStyle = {
  icon_url: string
  text: string;
  [property: string]: any
}

type FluffyDesc = {
  rich_text_nodes: TentacledRichTextNode[]
  text: string;
  [property: string]: any
}

type TentacledRichTextNode = {
  jump_url: string
  orig_text: string
  rid: string
  text: string
  type: string;
  [property: string]: any
}

type ModuleDynamicMajor = {
  draw: FluffyDraw
  type: string;
  [property: string]: any
}

type FluffyDraw = {
  id: number
  items: FluffyItem[];
  [property: string]: any
}

type FluffyItem = {
  height: number
  size: number
  src: string
  tags: string[]
  width: number;
  [property: string]: any
}
