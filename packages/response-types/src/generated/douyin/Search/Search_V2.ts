// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/search.requests.json 里
//   query / type  视频类型

export type Search_V2 = {
  aweme_list: null
  backtrace: string
  cursor: number
  data: unknown[]
  extra: Extra
  global_doodle_config: GlobalDoodleConfig
  has_more: number
  log_pb: LogPb
  mock_recall_path: string
  path: string
  search_nil_info: SearchNilInfo
  status_code: number
  [property: string]: any
}

type Extra = {
  fatal_item_ids: unknown[]
  logid: string
  now: number
  scenes: null
  search_request_id: string
  [property: string]: any
}

type GlobalDoodleConfig = {
  filter_settings: FilterSetting[]
  keyword: string
  [property: string]: any
}

type FilterSetting = {
  android_version: number
  btm: string
  default_index: number
  enable_huo_shan: boolean
  enable_lite: boolean
  harmony_version: number
  huoshan_android_version: number
  huoshan_ios_version: number
  ios_version: number
  items: Item[]
  lite_android_version: number
  lite_harmony_version: number
  lite_ios_version: number
  log_name: string
  name: string
  search_less_text?: SearchLessText
  search_nil_text?: SearchLessText
  title: string
  [property: string]: any
}

type Item = {
  log_value: string
  show_dot?: number
  title: string
  value: string
  [property: string]: any
}

type SearchLessText = {
  info: string
  jump_text: string
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}

type SearchNilInfo = {
  is_load_more: string
  search_nil_item: string
  search_nil_type: string
  text_type: number
  [property: string]: any
}
