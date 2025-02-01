export type SuggestWords = {
  data: Datum[]
  errno: string
  extra: Extra
  log_id: string
  msg: string
  real_log_id: string
  StabilityStatistics: StabilityStatistics;
  [property: string]: any
}

type StabilityStatistics = {
  1: string;
  [property: string]: any
}

type Datum = {
  params?: DatumParams
  source?: string
  type?: string
  words?: Word[];
  [property: string]: any
}

type DatumParams = {
  extra_info: PurpleExtraInfo
  from_gid: string
  impr_id: string
  query_id: string;
  [property: string]: any
}

type PurpleExtraInfo = {
  msg: string
  qrec_channel: string
  qrec_channel_is_aweme: string
  src_comment_id: string
  src_group_id: string;
  [property: string]: any
}

type Word = {
  id: string
  params: WordParams
  word: string;
  [property: string]: any
}

type WordParams = {
  extra_info: FluffyExtraInfo
  from_gid: string
  reason: string;
  [property: string]: any
}

type FluffyExtraInfo = {
  mark: string
  rel_info: string;
  [property: string]: any
}

type Extra = {
  call_per_refresh: string
  qrec_extra: string
  RespFrom: string
  time_cost: TimeCost;
  [property: string]: any
}

type TimeCost = {
  call_rpc_time: string
  init_time: string
  server_engine_cost: string
  stream_inner: string;
  [property: string]: any
}
