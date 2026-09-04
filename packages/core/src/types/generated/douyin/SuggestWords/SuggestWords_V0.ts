// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。

export type SuggestWords_V0 = {
  StabilityStatistics: StabilityStatistics
  data: Data[]
  errno: string
  extra: Extra
  log_id: string
  msg: string
  real_log_id: string
  [property: string]: any
}

type StabilityStatistics = {
  '1': string
  [property: string]: any
}

type Data = {
  params: Params
  source: string
  type: string
  words: unknown[]
  [property: string]: any
}

type Params = {
  channel_id: number
  extra_info: ExtraInfo
  from_gid: string
  impr_id: string
  query_id: string
  [property: string]: any
}

type ExtraInfo = {
  empty_reason: string
  msg: string
  qrec_channel: string
  qrec_channel_is_aweme: string
  src_comment_id: string
  src_group_id: string
  [property: string]: any
}

type Extra = {
  RespFrom: string
  call_per_refresh: string
  qrec_extra: string
  time_cost: TimeCost
  [property: string]: any
}

type TimeCost = {
  call_extra_time: string
  call_rpc_time: string
  init_time: string
  networkServerEngineRequestTime: string
  networkServerEngineResponseTime: string
  networkServerRequestTime: string
  networkServerResponseTime: string
  server_engine_cost: string
  stream_inner: string
  [property: string]: any
}
