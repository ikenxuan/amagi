export type DyDanmakuList = {
  danmaku_list: DanmakuList[]
  end_time: number
  extra: DataExtra
  log_pb: LogPb
  start_time: number
  status_code: number
  total: number
  [property: string]: any
}

type DanmakuList = {
  danmaku_id: string
  danmaku_logos: null
  danmaku_type: number
  danmaku_type_bits: number
  digg_count: number
  digg_type: number
  dislike_type: number
  extra: DanmakuListExtra
  from_copy: boolean
  has_emoji: boolean
  is_ad: boolean
  item_id: string
  offset_time: number
  score: number
  show_copy: boolean
  show_digg: boolean
  status: number
  text: string
  user_id: string;
  [property: string]: any
}

type DanmakuListExtra = {
  big_thumb: null
  style_list: null;
  [property: string]: any
}

type DataExtra = {
  fatal_item_ids: string[]
  logid: string
  now: number;
  [property: string]: any
}

type LogPb = {
  impr_id: string;
  [property: string]: any
}
