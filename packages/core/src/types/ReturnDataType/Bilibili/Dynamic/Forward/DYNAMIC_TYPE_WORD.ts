import { DynamicType } from '../../DynamicInfo'

export type DynamicTypeWord = {
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
  basic: ItemBasic
  id_str: string
  modules: ItemModules
  orig: Orig
  type: DynamicType.WORD
  visible: boolean;
  [property: string]: any
}

type ItemBasic = {
  comment_id_str: string
  comment_type: number
  editable: boolean
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
  module_more: ModuleMore
  module_stat: ModuleStat;
  [property: string]: any
}

type PurpleModuleAuthor = {
  avatar: PurpleAvatar
  face: string
  face_nft: boolean
  following: null
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
  is_critical?: boolean
  tags: PurpleTags;
  [property: string]: any
}

type PurpleTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: PurpleGENERALCFG
  ICON_LAYER: { [key: string]: any };
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
  additional: Additional
  desc: Desc
  major: null
  topic: Topic;
  [property: string]: any
}

type Additional = {
  type: string
  reserve: Reserve;
  [property: string]: any
}

type Reserve = {
  button: Button
  desc1: Desc1
  desc2: Desc2
  jump_url: string
  reserve_total: number
  rid: number
  state: number
  stype: number
  title: string
  up_mid: number;
  [property: string]: any
}

type Button = {
  check: Check
  status: number
  type: number
  uncheck: Uncheck;
  [property: string]: any
}

type Check = {
  icon_url: string
  text: string;
  [property: string]: any
}

type Uncheck = {
  disable: number
  icon_url: string
  text: string
  toast: string;
  [property: string]: any
}

type Desc1 = {
  style: number
  text: string;
  [property: string]: any
}

type Desc2 = {
  style: number
  text: string
  visible: boolean;
  [property: string]: any
}

type Desc = {
  rich_text_nodes: DescRichTextNode[]
  text: string;
  [property: string]: any
}

type DescRichTextNode = {
  emoji?: Emoji
  orig_text: string
  rid?: string
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
  label: string
  modal?: Modal
  params: Params
  type: string;
  [property: string]: any
}

type Modal = {
  cancel: string
  confirm: string
  content: string
  title: string;
  [property: string]: any
}

type Params = {
  dyn_id_str: string
  dyn_type: number
  dynamic_id?: string
  rid_str: string
  status?: number
  type?: number;
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
  jump_url: string
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
  decoration_card: DecorationCard
  face: string
  face_nft: boolean
  following: null
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
  additional: null
  desc: null
  major: Major
  topic: null;
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
  rich_text_nodes: SummaryRichTextNode[]
  text: string;
  [property: string]: any
}

type SummaryRichTextNode = {
  jump_url?: string
  orig_text: string
  text: string
  type: string;
  [property: string]: any
}
