/**
 * 转发动态里被转发的**图文**动态（`data.item.type === DYNAMIC_TYPE_DRAW`）。
 *
 * ## 这个文件是两份类型合并来的
 *
 * 2026-09-04 之前这里是 `_V0` + `_V1` 两个文件，`index.ts` 把它们联合起来对外。
 * 但那两份**不是两个变体**，是同一个接口**两次抓包赶上的数据不一样**（PRD 1.3）。
 * `_V<n>` 的语义是「同一判别式取值下仍然**合不掉**的形状序号」（见
 * `docs/v7/dev/internals/contracts.mdx`「文件名里的 `_V<n>` 不是 API 版本号」），
 * 抓包漂移不符合那个语义，所以两份合成了这一份。
 *
 * ## 所以下面这些可选 / 联合是「两次抓包只有一次有」的如实记录
 *
 * 不是平台契约变松了，而是原先被写成两个类型的那些差异，落到一个类型上只能这么表达
 * （路径相对 `data.item`，`orig.…` 那几条在被转发的原动态里）：
 *
 * | 位置 | 旧 `_V0` | 旧 `_V1` | 合并后 |
 * |---|---|---|---|
 * | `basic.editable` | 有 | 没有 | `editable?` |
 * | `modules.module_dynamic.additional` | `null` | 有相关内容卡片对象 | `Additional \| null`（`Additional` / `Common` / `Button` / `JumpStyle` 来自旧 `_V1`） |
 * | `modules.module_dynamic.topic` | `Topic` | `null` | `Topic \| null` |
 * | `…module_dynamic.desc.rich_text_nodes[]` | `orig_text` / `text` / `type` 必需 | 元素形状不齐，三个键都可缺 | 三个键都可选 |
 * | `modules.module_more.three_point_items[]` | `label` / `params` / `type` 必需 | 只有 `label?` / `type?` | 四个键都可选 |
 * | `orig.…major.opus.pics[]` | 5 个键 | 多 `aigc` | `aigc?` |
 * | `orig.…major.opus.summary.rich_text_nodes[]` | 有 `jump_url?` | 多 `rid` / `style` | 两个新键可选 |
 *
 * 与隔壁 `DYNAMIC_TYPE_AV` 那次合并**差异清单不一样**（那边是装扮卡与 `orig` 的
 * `desc`，这边是相关内容卡片与 `summary` 的富文本），所以两边各写一份表，别互相套用。
 *
 * 合并规则照 PRD 第五节：两份都有且同类型 → 保持必需；只有一份有 → `?:`；值类型不同 →
 * 联合（`null` 与「缺键」是**两个维度**，各记一份）；嵌套对象递归套用同样的规则。
 * 每一层的 `[property: string]: any` 是硬约束，删不得 ——
 * `test/types/response-types.test-d.ts` 用它承诺「平台加字段不算 breaking、
 * 读未声明字段结果是 `any`」。
 *
 * 再抓到形状不一样的报文：**直接改这个文件**（新键加成可选），不要再开 `_V1`。
 */
import { DynamicType } from '../../../../DynamicType'

export type DynamicTypeDraw_V0 = {
  code: number
  data: DataData
  message: string
  ttl: number
  [property: string]: any
}

type DataData = {
  item: Item
  [property: string]: any
}

type Item = {
  basic: ItemBasic
  id_str: string
  modules: ItemModules
  orig: Orig
  type: DynamicType.DRAW
  visible: boolean
  [property: string]: any
}

type ItemBasic = {
  comment_id_str: string
  comment_type: number
  /** 合并说明见文件头：旧 `_V1` 那次抓包没有这个键 */
  editable?: boolean
  like_icon: PurpleLikeIcon
  rid_str: string
  [property: string]: any
}

type PurpleLikeIcon = {
  action_url: string
  end_url: string
  id: number
  start_url: string
  [property: string]: any
}

type ItemModules = {
  module_author: PurpleModuleAuthor
  module_dynamic: PurpleModuleDynamic
  module_more: ModuleMore
  module_stat: ModuleStat
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
  vip: PurpleVip
  [property: string]: any
}

type PurpleAvatar = {
  container_size: PurpleContainerSize
  fallback_layers: PurpleFallbackLayers
  mid: string
  [property: string]: any
}

type PurpleContainerSize = {
  height: number
  width: number
  [property: string]: any
}

type PurpleFallbackLayers = {
  is_critical_group: boolean
  layers: PurpleLayer[]
  [property: string]: any
}

type PurpleLayer = {
  general_spec: PurpleGeneralSpec
  layer_config: PurpleLayerConfig
  resource: PurpleResource
  visible: boolean
  [property: string]: any
}

type PurpleGeneralSpec = {
  pos_spec: PurplePosSpec
  render_spec: PurpleRenderSpec
  size_spec: PurpleSizeSpec
  [property: string]: any
}

type PurplePosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number
  [property: string]: any
}

type PurpleRenderSpec = {
  opacity: number
  [property: string]: any
}

type PurpleSizeSpec = {
  height: number
  width: number
  [property: string]: any
}

type PurpleLayerConfig = {
  is_critical?: boolean
  tags: PurpleTags
  [property: string]: any
}

type PurpleTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: PurpleGENERALCFG
  ICON_LAYER: { [key: string]: any }
  [property: string]: any
}

type PurpleGENERALCFG = {
  config_type: number
  general_config: PurpleGeneralConfig
  [property: string]: any
}

type PurpleGeneralConfig = {
  web_css_style: PurpleWebcssStyle
  [property: string]: any
}

type PurpleWebcssStyle = {
  'background-color': string
  border: string
  borderRadius: string
  boxSizing: string
  [property: string]: any
}

type PurpleResource = {
  res_image: PurpleResImage
  res_type: number
  [property: string]: any
}

type PurpleResImage = {
  image_src: PurpleImageSrc
  [property: string]: any
}

type PurpleImageSrc = {
  local: number
  placeholder?: number
  remote?: PurpleRemote
  src_type: number
  [property: string]: any
}

type PurpleRemote = {
  bfs_style: string
  url: string
  [property: string]: any
}

type PurpleOfficialVerify = {
  desc: string
  type: number
  [property: string]: any
}

type PurplePendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number
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
  type: number
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
  use_img_label: boolean
  [property: string]: any
}

type PurpleModuleDynamic = {
  /** 合并说明见文件头：旧 `_V0` 抓到 `null`、旧 `_V1` 抓到相关内容卡片 */
  additional: Additional | null
  desc: Desc
  major: null
  /** 合并说明见文件头：旧 `_V0` 抓到话题对象、旧 `_V1` 抓到 `null` */
  topic: Topic | null
  [property: string]: any
}

/** 相关内容卡片（种类见 `Dynamic/index.ts` 的 `AdditionalType`）。只有旧 `_V1` 那次抓到 */
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
  rich_text_nodes: DescRichTextNode[]
  text: string
  [property: string]: any
}

/** 旧 `_V1` 那次抓到的元素形状不齐（三个键都可缺），所以全部可选（合并说明见文件头） */
type DescRichTextNode = {
  emoji?: Emoji
  orig_text?: string
  rid?: string
  text?: string
  type?: string
  [property: string]: any
}

type Emoji = {
  icon_url: string
  size: number
  text: string
  type: number
  [property: string]: any
}

type Topic = {
  id: number
  jump_url: string
  name: string
  [property: string]: any
}

type ModuleMore = {
  three_point_items: ThreePointItem[]
  [property: string]: any
}

/** 旧 `_V1` 那次抓到的元素只有 `label` / `type`，所以四个键都可选（合并说明见文件头） */
type ThreePointItem = {
  label?: string
  modal?: Modal
  params?: Params
  type?: string
  [property: string]: any
}

type Modal = {
  cancel: string
  confirm: string
  content: string
  title: string
  [property: string]: any
}

type Params = {
  dyn_id_str: string
  dyn_type: number
  dynamic_id?: string
  rid_str: string
  status?: number
  type?: number
  [property: string]: any
}

type ModuleStat = {
  comment: Comment
  forward: Forward
  like: Like
  [property: string]: any
}

type Comment = {
  count: number
  forbidden: boolean
  [property: string]: any
}

type Forward = {
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

type Orig = {
  basic: OrigBasic
  id_str: string
  modules: OrigModules
  type: string
  visible: boolean
  [property: string]: any
}

type OrigBasic = {
  comment_id_str: string
  comment_type: number
  jump_url: string
  like_icon: FluffyLikeIcon
  rid_str: string
  [property: string]: any
}

type FluffyLikeIcon = {
  action_url: string
  end_url: string
  id: number
  start_url: string
  [property: string]: any
}

type OrigModules = {
  module_author: FluffyModuleAuthor
  module_dynamic: FluffyModuleDynamic
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
  vip: FluffyVip
  [property: string]: any
}

type FluffyAvatar = {
  container_size: FluffyContainerSize
  fallback_layers: FluffyFallbackLayers
  mid: string
  [property: string]: any
}

type FluffyContainerSize = {
  height: number
  width: number
  [property: string]: any
}

type FluffyFallbackLayers = {
  is_critical_group: boolean
  layers: FluffyLayer[]
  [property: string]: any
}

type FluffyLayer = {
  general_spec: FluffyGeneralSpec
  layer_config: FluffyLayerConfig
  resource: FluffyResource
  visible: boolean
  [property: string]: any
}

type FluffyGeneralSpec = {
  pos_spec: FluffyPosSpec
  render_spec: FluffyRenderSpec
  size_spec: FluffySizeSpec
  [property: string]: any
}

type FluffyPosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number
  [property: string]: any
}

type FluffyRenderSpec = {
  opacity: number
  [property: string]: any
}

type FluffySizeSpec = {
  height: number
  width: number
  [property: string]: any
}

type FluffyLayerConfig = {
  is_critical?: boolean
  tags: FluffyTags
  [property: string]: any
}

type FluffyTags = {
  AVATAR_LAYER?: { [key: string]: any }
  GENERAL_CFG: FluffyGENERALCFG
  ICON_LAYER: { [key: string]: any }
  PENDENT_LAYER?: { [key: string]: any }
  [property: string]: any
}

type FluffyGENERALCFG = {
  config_type: number
  general_config: FluffyGeneralConfig
  [property: string]: any
}

type FluffyGeneralConfig = {
  web_css_style: FluffyWebcssStyle
  [property: string]: any
}

type FluffyWebcssStyle = {
  'background-color': string
  border: string
  borderRadius: string
  boxSizing: string
  [property: string]: any
}

type FluffyResource = {
  res_image: FluffyResImage
  res_type: number
  [property: string]: any
}

type FluffyResImage = {
  image_src: FluffyImageSrc
  [property: string]: any
}

type FluffyImageSrc = {
  local: number
  placeholder?: number
  remote?: FluffyRemote
  src_type: number
  [property: string]: any
}

type FluffyRemote = {
  bfs_style: string
  url: string
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
  name: string
  [property: string]: any
}

type Fan = {
  color: string
  color_format: ColorFormat
  is_fan: number
  name: string
  num_desc: string
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

type FluffyOfficialVerify = {
  desc: string
  type: number
  [property: string]: any
}

type FluffyPendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number
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
  type: number
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
  use_img_label: boolean
  [property: string]: any
}

type FluffyModuleDynamic = {
  additional: null
  desc: null
  major: Major
  topic: null
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
  /** 只有旧 `_V1` 那次抓包有（合并说明见文件头） */
  aigc?: null
  height?: number
  live_url?: null
  size?: number
  url?: string
  width?: number
  [property: string]: any
}

type Summary = {
  rich_text_nodes: SummaryRichTextNode[]
  text: string
  [property: string]: any
}

/** `rid` / `style` 只有旧 `_V1` 那次抓到，所以可选（合并说明见文件头） */
type SummaryRichTextNode = {
  jump_url?: string
  orig_text: string
  rid?: string
  style?: { [key: string]: any }
  text: string
  type: string
  [property: string]: any
}
