export type DyEmojiProList = {
  decision_trees: DecisionTrees
  diverter_tags: DiverterTags
  do_not_retry: boolean
  extra: EmojiProListExtra
  flame_achieve_dashboard: FlameAchieveDashboard
  interactive_resource_config: InteractiveResourceConfig
  log_pb: LogPb
  report_toggles: ReportToggles
  status_code: number
  status_msg: string;
  [property: string]: any
}

type DecisionTrees = {
  flame_achieve: FlameAchieve
  interactive_resources: InteractiveResources;
  [property: string]: any
}

type FlameAchieve = {
  default_config_name: string
  root: FlameAchieveRoot;
  [property: string]: any
}

type FlameAchieveRoot = {
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  sub_node: PurpleSubNode[];
  [property: string]: any
}

type PurpleSubNode = {
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  sub_node?: FluffySubNode[];
  [property: string]: any
}

type FluffySubNode = {
  config_name: string
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  sub_node: TentacledSubNode[];
  [property: string]: any
}

type TentacledSubNode = {
  config_name: string
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  sub_node: StickySubNode[];
  [property: string]: any
}

type StickySubNode = {
  config_name: string
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  sub_node: IndigoSubNode[];
  [property: string]: any
}

type IndigoSubNode = {
  config_name: string
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string;
  [property: string]: any
}

type InteractiveResources = {
  default_config_name: string
  root: InteractiveResourcesRoot;
  [property: string]: any
}

type InteractiveResourcesRoot = {
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string
  sub_node: IndecentSubNode[];
  [property: string]: any
}

type IndecentSubNode = {
  config_name: string
  node_attribute: string
  node_operation: string
  node_type: string
  node_value: string;
  [property: string]: any
}

type DiverterTags = {
  actionbar_diff: string
  flame_achieve: string
  interactive_resources: string
  interactive_resources_v2: string
  plus_panel_diff: string;
  [property: string]: any
}

type EmojiProListExtra = {
  fatal_item_ids: string[]
  logid: string
  now: number;
  [property: string]: any
}

type FlameAchieveDashboard = {
  '火花成就--小火人': 火花成就小火人
  火花成就日常: 火花成就日常
  '火花成就日常-群聊': 火花成就日常群聊
  火花成就日常V2: 火花成就日常V2
  '火花成就日常V2-群聊': 火花成就日常V2群聊
  火花成就测试: 火花成就测试
  '火花成就节日测试-群聊': 火花成就节日测试群聊;
  [property: string]: any
}

type 火花成就小火人 = {
  detail: 火花成就小火人_Detail[]
  pet_elf_detail: PetelfDetail[];
  [property: string]: any
}

type 火花成就小火人_Detail = {
  detail_subtitle_lock: string[]
  detail_subtitle_unflame: string[]
  flame_info: PurpleFlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  subtitle_lock: string
  title: string;
  [property: string]: any
}

type PurpleFlameInfo = {
  detail_subtitle: string[]
  flame_achieve_url: string
  key: string
  subscript_color: string
  subtitle: string
  title: string;
  [property: string]: any
}

type PetelfDetail = {
  detail_subtitle_unflame?: string[]
  flame_info?: PetelfDetailFlameInfo[]
  flame_to_achieve_url?: string
  keys?: string[]
  subscript?: string
  subtitle?: string
  title?: string;
  [property: string]: any
}

type PetelfDetailFlameInfo = {
  detail_subtitle?: string[]
  flame_achieve_url?: string
  key?: string
  subscript_color?: string
  subtitle?: string
  title?: string;
  [property: string]: any
}

type 火花成就日常 = {
  detail: 火花成就日常_Detail[];
  [property: string]: any
}

type 火花成就日常_Detail = {
  detail_subtitle_unflame: string[]
  flame_info: FluffyFlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  title: string;
  [property: string]: any
}

type FluffyFlameInfo = {
  detail_subtitle: string[]
  flame_achieve_url: string
  key: string
  subscript_color: string
  subtitle: string
  title: string;
  [property: string]: any
}

type 火花成就日常群聊 = {
  detail: 火花成就日常群聊_Detail[];
  [property: string]: any
}

type 火花成就日常群聊_Detail = {
  detail_subtitle_unflame: string[]
  flame_info: TentacledFlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  title: string;
  [property: string]: any
}

type TentacledFlameInfo = {
  detail_subtitle: string[]
  flame_achieve_url: string
  key: string
  subscript_color: string
  subtitle: string
  title: string;
  [property: string]: any
}

type 火花成就日常V2 = {
  detail: 火花成就日常V2Detail[];
  [property: string]: any
}

type 火花成就日常V2Detail = {
  detail_subtitle_lock: string[]
  detail_subtitle_unflame: string[]
  flame_info: StickyFlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  subtitle_lock: string
  title: string;
  [property: string]: any
}

type StickyFlameInfo = {
  detail_subtitle: string[]
  flame_achieve_url: string
  key: string
  subscript_color: string
  subtitle: string
  title: string;
  [property: string]: any
}

type 火花成就日常V2群聊 = {
  detail: 火花成就日常V2群聊_Detail[];
  [property: string]: any
}

type 火花成就日常V2群聊_Detail = {
  detail_subtitle_lock: string[]
  detail_subtitle_unflame: string[]
  flame_info: IndigoFlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  subtitle_lock: string
  title: string;
  [property: string]: any
}

type IndigoFlameInfo = {
  detail_subtitle: string[]
  flame_achieve_url: string
  key: string
  subscript_color: string
  subtitle: string
  title: string;
  [property: string]: any
}

type 火花成就测试 = {
  detail: 火花成就测试_Detail[];
  [property: string]: any
}

type 火花成就测试_Detail = {
  detail_subtitle_unflame: string[]
  flame_info: IndecentFlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  title: string;
  [property: string]: any
}

type IndecentFlameInfo = {
  detail_subtitle: string[]
  flame_achieve_url: string
  key: string
  subscript_color: string
  subtitle: string
  title: string;
  [property: string]: any
}

type 火花成就节日测试群聊 = {
  detail: 火花成就节日测试群聊_Detail[];
  [property: string]: any
}

type 火花成就节日测试群聊_Detail = {
  detail_subtitle_unflame: string[]
  flame_info: HilariousFlameInfo[]
  flame_to_achieve_url: string
  keys: string[]
  subscript: string
  subtitle: string
  title: string;
  [property: string]: any
}

type HilariousFlameInfo = {
  detail_subtitle: string[]
  flame_achieve_url: string
  key: string
  subscript_color: string
  subtitle: string
  title: string;
  [property: string]: any
}

type InteractiveResourceConfig = {
  '100-2025春节互动表情\t': The1002025春节互动表情
  '2025 春节-Android': The2025春节Android
  '2025 春节-Android更新': The2025春节Android更新
  '互动表情升级 一期': 互动表情升级一期;
  [property: string]: any
}

type The1002025春节互动表情 = {
  animate_icon: { [key: string]: any }
  icon_url: string
  interactive_resources: The1002025春节互动表情_InteractiveResource[]
  special_resources: The1002025春节互动表情_SpecialResource[];
  [property: string]: any
}

type The1002025春节互动表情_InteractiveResource = {
  animate_type: string
  animate_url: string
  display_name: string
  extra: PurpleExtra
  height: number
  resource_type: number
  static_type: string
  static_url: string
  static_url_list: PurpleStaticurlList[]
  sticker_info_source: string
  version: number
  visible_end_time: number
  width: number;
  [property: string]: any
}

type PurpleExtra = {
  activity_scene?: string
  hint_content?: string
  light_interaction: string
  sticker_info_source?: string;
  [property: string]: any
}

type PurpleStaticurlList = {
  static_type: string
  static_url: string;
  [property: string]: any
}

type The1002025春节互动表情_SpecialResource = {
  config: PurpleConfig
  in_advance: boolean
  name: string
  relation_name: string[]
  special_resource: string
  special_type: number
  trigger_type: string
  version: number;
  [property: string]: any
}

type PurpleConfig = {
  continuous_show?: string
  random_show: string
  receiver_show?: string
  sender_show?: string;
  [property: string]: any
}

type The2025春节Android = {
  animate_icon: { [key: string]: any }
  icon_url: string
  interactive_resources: The2025春节AndroidInteractiveResource[]
  special_resources: The2025春节AndroidSpecialResource[];
  [property: string]: any
}

type The2025春节AndroidInteractiveResource = {
  animate_type: string
  animate_url: string
  display_name: string
  extra: FluffyExtra
  height: number
  resource_type: number
  static_type: string
  static_url: string
  static_url_list: FluffyStaticurlList[]
  sticker_info_source: string
  version: number
  visible_end_time: number
  width: number;
  [property: string]: any
}

type FluffyExtra = {
  activity_scene?: string
  hint_content?: string
  light_interaction: string
  sticker_info_source?: string;
  [property: string]: any
}

type FluffyStaticurlList = {
  static_type: string
  static_url: string;
  [property: string]: any
}

type The2025春节AndroidSpecialResource = {
  config: FluffyConfig
  in_advance: boolean
  name: string
  relation_name: string[]
  special_resource: string
  special_type: number
  trigger_type: string
  version: number;
  [property: string]: any
}

type FluffyConfig = {
  continuous_show?: string
  random_show: string
  receiver_show?: string
  sender_show?: string;
  [property: string]: any
}

type The2025春节Android更新 = {
  animate_icon: { [key: string]: any }
  icon_url: string
  interactive_resources: The2025春节Android更新_InteractiveResource[]
  special_resources: The2025春节Android更新_SpecialResource[];
  [property: string]: any
}

type The2025春节Android更新_InteractiveResource = {
  animate_type: string
  animate_url: string
  display_name: string
  extra: TentacledExtra
  height: number
  resource_type: number
  static_type: string
  static_url: string
  static_url_list: TentacledStaticurlList[]
  sticker_info_source: string
  version: number
  visible_end_time: number
  width: number;
  [property: string]: any
}

type TentacledExtra = {
  activity_scene?: string
  hint_content?: string
  light_interaction: string
  sticker_info_source?: string;
  [property: string]: any
}

type TentacledStaticurlList = {
  static_type: string
  static_url: string;
  [property: string]: any
}

type The2025春节Android更新_SpecialResource = {
  config: TentacledConfig
  in_advance: boolean
  name: string
  relation_name: string[]
  special_resource: string
  special_type: number
  trigger_type: string
  version: number;
  [property: string]: any
}

type TentacledConfig = {
  continuous_show?: string
  random_show: string
  receiver_show?: string
  sender_show?: string;
  [property: string]: any
}

type 互动表情升级一期 = {
  animate_icon: { [key: string]: any }
  icon_url: string
  interactive_resources: 互动表情升级一期_InteractiveResource[]
  special_resources: 互动表情升级一期_SpecialResource[];
  [property: string]: any
}

type 互动表情升级一期_InteractiveResource = {
  animate_type: string
  animate_url: string
  display_name: string
  extra: StickyExtra
  height: number
  resource_type: number
  static_type: string
  static_url: string
  static_url_list: StickyStaticurlList[]
  sticker_info_source: string
  version: number
  width: number;
  [property: string]: any
}

type StickyExtra = {
  light_interaction: string;
  [property: string]: any
}

type StickyStaticurlList = {
  static_type: string
  static_url: string;
  [property: string]: any
}

type 互动表情升级一期_SpecialResource = {
  config: StickyConfig
  in_advance: boolean
  name: string
  relation_name: string[]
  special_resource: string
  special_type: number
  trigger_type: string
  version: number;
  [property: string]: any
}

type StickyConfig = {
  continuous_show?: string
  random_show: string
  receiver_show?: string
  sender_show?: string;
  [property: string]: any
}

type LogPb = {
  impr_id: string;
  [property: string]: any
}

type ReportToggles = {
  actionbar_diff: number
  flame_achieve: number
  interactive_resources: number
  interactive_resources_v2: number
  plus_panel_diff: number;
  [property: string]: any
}
