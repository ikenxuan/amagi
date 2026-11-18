// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.11）。参数与说明在 corpus/douyin/appSuggestWords.requests.json 里
//   query  2026-11-18 游客设备真实请求；无账号登录态

export type AppSuggestWords_V0 = {
  cache_conf: CacheConf
  extra: Extra
  log_pb: LogPb
  rid: string
  status_code: number
  status_msg: string
  sug_list: SugList[]
  sug_virtual_list: null
  time_cost: TimeCost
  words_lists: unknown[]
  words_query_record: WordsQueryRecord
  [property: string]: any
}

type CacheConf = {
  enable: boolean
  [property: string]: any
}

type Extra = {
  fatal_item_ids: unknown[]
  logid: string
  now: number
  search_request_id: string
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}

type SugList = {
  content: string
  extra_info: ExtraInfo
  pos: Po[]
  sug_type: string
  word_record: WordRecord
  [property: string]: any
}

type ExtraInfo = {
  search_params: string
  [property: string]: any
}

type Po = {
  begin: number
  end: number
  [property: string]: any
}

type WordRecord = {
  group_id: string
  words_content: string
  words_position: number
  words_source: string
  [property: string]: any
}

type TimeCost = {
  server_engine_cost: string
  stream_inner: string
  [property: string]: any
}

type WordsQueryRecord = {
  info: string
  query_id: string
  words_source: string
  [property: string]: any
}
