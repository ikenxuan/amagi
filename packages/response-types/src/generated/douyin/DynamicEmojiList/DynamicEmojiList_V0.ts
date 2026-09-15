// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/dynamicEmojiList.requests.json 里
//   无参数

export type DynamicEmojiList_V0 = {
  decision_trees: DecisionTrees
  diverter_tags: DiverterTags
  do_not_retry: boolean
  extra: Extra
  flame_achieve_dashboard: FlameAchieveDashboard
  interactive_resource_config: InteractiveResourceConfig
  log_pb: LogPb
  report_toggles: ReportToggles
  status_code: number
  status_msg: string
  [property: string]: any
}

type DecisionTrees = {
  flame_achieve: FlameAchieve
  interactive_resources: InteractiveResources
  [property: string]: any
}

type FlameAchieve = {
  default_config_name: string
  root: Root
  [property: string]: any
}

type Root = {
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  sub_node: SubNode[]
  [property: string]: any
}

type SubNode = {
  config_name?: string
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  sub_node?: SubNode2[]
  [property: string]: any
}

type SubNode2 = {
  config_name: string
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  [property: string]: any
}

type InteractiveResources = {
  default_config_name: string
  root: SubNode2
  [property: string]: any
}

type DiverterTags = {
  actionbar_diff: string
  flame_achieve: string
  interactive_resources: string
  interactive_resources_v2: string
  plus_panel_diff: string
  [property: string]: any
}

type Extra = {
  fatal_item_ids: unknown[]
  logid: string
  now: number
  [property: string]: any
}

type FlameAchieveDashboard = {
  '火花成就-小火人加日常题材加下线密友': Anonymous
  '火花成就日常': Anonymous2
  '火花成就日常-群聊': Anonymous2
  '火花成就日常V2': V2
  '火花成就日常V2-群聊': V2
  '火花成就测试': Anonymous2
  '火花成就节日测试-群聊': Anonymous2
  [property: string]: any
}

type Anonymous = {
  detail: Detail[]
  pet_elf_detail: PetElfDetail[]
  [property: string]: any
}

type Detail = {
  detail_subtitle_lock?: string[]
  detail_subtitle_unflame: string[]
  flame_info: FlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  subtitle_lock?: string
  title: string
  [property: string]: any
}

type FlameInfo = {
  detail_subtitle: string[]
  flame_achieve_url: string
  key: string
  subscript_color: string
  subtitle: string
  title: string
  [property: string]: any
}

type PetElfDetail = {
  detail_subtitle_unflame: string[]
  flame_info: FlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  title: string
  [property: string]: any
}

type Anonymous2 = {
  detail: PetElfDetail[]
  [property: string]: any
}

type V2 = {
  detail: Detail[]
  [property: string]: any
}

type InteractiveResourceConfig = {
  '互动表情-26常规（新-0902）': T260902
  [property: string]: any
}

type T260902 = {
  animate_icon: { [property: string]: any }
  icon_url: string
  interactive_resources: InteractiveResource[]
  special_resources: SpecialResource[]
  [property: string]: any
}

type InteractiveResource = {
  animate_type: string
  animate_url: string
  biz_type: number
  display_name: string
  extra?: Extra2
  height: number
  resource_type?: number
  resource_variant_list?: ResourceVariantList[]
  static_type: string
  static_url: string
  static_url_list?: StaticUrlList[]
  sticker_info_source: string
  version: number
  visible_end_time?: number
  visible_start_time?: number
  width: number
  [property: string]: any
}

type Extra2 = {
  activity_desc?: string
  activity_schema?: string
  light_interaction?: string
  [property: string]: any
}

type ResourceVariantList = {
  animate_type: string
  animate_url: string
  display_name: string
  extra: Extra3
  random_weight: number
  static_type: string
  static_url: string
  sticker_quick_reply: StickerQuickReply[]
  [property: string]: any
}

type Extra3 = {
  light_interaction: string
  [property: string]: any
}

type StickerQuickReply = {
  display_name: string
  show_name?: string
  sticker_type: number
  [property: string]: any
}

type StaticUrlList = {
  static_type: string
  static_url: string
  [property: string]: any
}

type SpecialResource = {
  config?: Config
  in_advance?: boolean
  name: string
  relation_name: string[]
  special_resource: string
  special_type: number
  trigger_type?: string
  version: number
  [property: string]: any
}

type Config = {
  continuous_show?: string
  custom_action?: string
  no_same_sender?: string
  random_show?: string
  receiver_show?: string
  sender_show?: string
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}

type ReportToggles = {
  actionbar_diff: number
  flame_achieve: number
  interactive_resources: number
  interactive_resources_v2: number
  plus_panel_diff: number
  [property: string]: any
}
