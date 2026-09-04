/**
 * 转发动态里被转发的**视频**动态（`data.item.type === DYNAMIC_TYPE_AV`）。
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
 * | `modules.module_author.decoration_card` | 没有 | 有（`fan` 是空对象） | `decoration_card?: PurpleDecorationCard` |
 * | `orig.…module_author.decoration_card` | 有（`fan` 有结构） | 没有 | `decoration_card?: DecorationCard` |
 * | `modules.module_dynamic.topic` | `Topic` | `null` | `Topic \| null` |
 * | `…module_dynamic.desc.rich_text_nodes[]` | 有 `rid` | 换成 `jump_url` + `style` | 三个都可选 |
 * | `…rich_text_nodes[].emoji` | 4 个键 | 多 `id` / `package_id` | 多出来的两个可选 |
 * | `modules.module_more.three_point_items[]` | `label` / `params` / `type` 必需 | 只有 `label?` / `type?` | 四个键都可选 |
 * | `orig.…module_dynamic.desc` | `null` | 有对象 | `FluffyDesc \| null`（`FluffyDesc` / `FluffyRichTextNode` 来自旧 `_V1`） |
 * | `orig.…avatar.fallback_layers.layers[]` | 四个键齐全 | 元素形状不齐 | 四个键都可选 |
 * | `orig.…layer_config.tags.ICON_LAYER` | 有 | 没有 | `ICON_LAYER?` |
 * | `orig.…general_config.web_css_style` | 4 个键 | 只有 `borderRadius` | 另外 3 个可选 |
 * | `orig.…resource.res_image.image_src.local` | 有 | 没有 | `local?` |
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

export type DynamicTypeAV_V0 = {
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
  type: DynamicType.AV
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
  /** 合并说明见文件头：只有旧 `_V1` 那次抓到装扮卡 */
  decoration_card?: PurpleDecorationCard
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

/**
 * 装扮卡（转发者那侧）。只有旧 `_V1` 那次抓到它，而且那次的 `fan` 是**空对象** ——
 * 所以这里的 `fan` 只能是「任意键的对象」，`orig` 那侧的 `DecorationCard` 才有结构。
 */
type PurpleDecorationCard = {
  big_card_url: string
  card_type: number
  card_type_name: string
  card_url: string
  fan: { [key: string]: any }
  id: number
  image_enhance: string
  item_id: number
  jump_url: string
  name: string
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
  additional: null
  desc: Desc
  major: null
  /** 合并说明见文件头：旧 `_V0` 抓到话题对象、旧 `_V1` 抓到 `null` */
  topic: Topic | null
  [property: string]: any
}

type Desc = {
  rich_text_nodes: RichTextNode[]
  text: string
  [property: string]: any
}

/** `rid` / `jump_url` / `style` 各自只在一次抓包里出现，合并说明见文件头 */
type RichTextNode = {
  emoji?: Emoji
  jump_url?: string
  orig_text: string
  rid?: string
  style?: { [key: string]: any }
  text: string
  type: string
  [property: string]: any
}

type Emoji = {
  icon_url: string
  /** 只有旧 `_V1` 那次抓包有 */
  id?: number
  /** 只有旧 `_V1` 那次抓包有 */
  package_id?: number
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
  /** 合并说明见文件头：只有旧 `_V0` 那次抓到装扮卡 */
  decoration_card?: DecorationCard
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

/** 数组元素形状不一致（旧 `_V1` 那次抓到的两个 layer 各缺一半键），所以四个键都可选 */
type FluffyLayer = {
  general_spec?: FluffyGeneralSpec
  layer_config?: FluffyLayerConfig
  resource?: FluffyResource
  visible?: boolean
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
  /** 只有旧 `_V0` 那次抓包有（合并说明见文件头） */
  ICON_LAYER?: { [key: string]: any }
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

/** 旧 `_V1` 那次只抓到 `borderRadius`，其余三个键因此可选（合并说明见文件头） */
type FluffyWebcssStyle = {
  'background-color'?: string
  border?: string
  borderRadius: string
  boxSizing?: string
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
  /** 只有旧 `_V0` 那次抓包有（合并说明见文件头） */
  local?: number
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

/**
 * 装扮卡（`orig` 那侧）。只有旧 `_V0` 那次抓到它。
 *
 * 与转发者那侧的 `PurpleDecorationCard` **刻意分成两个类型**：两次抓包各只在一侧抓到卡，
 * 而且形状不同（这边的 `fan` 有结构、那边抓到的是空对象）。合成一个就得把 `fan` 的键
 * 全拉成可选，那会凭空削弱这一侧的类型（下游有按必需键读 `fan.color` 的代码）。
 */
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
  /** 合并说明见文件头：旧 `_V0` 抓到 `null`、旧 `_V1` 抓到对象 */
  desc: FluffyDesc | null
  major: Major
  topic: null
  [property: string]: any
}

/** 被转发原动态的正文。只有旧 `_V1` 那次抓到（旧 `_V0` 那次 `desc` 是 `null`） */
type FluffyDesc = {
  rich_text_nodes: FluffyRichTextNode[]
  text: string
  [property: string]: any
}

type FluffyRichTextNode = {
  jump_url: string
  orig_text: string
  style: null
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
