// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.11）。参数与说明在 corpus/douyin/appDanmakuList.requests.json 里
//   aweme_id / duration  2026-11-18 游客设备真实请求；无账号登录态

export type AppDanmakuList_V0 = {
  danmaku_list: DanmakuList[]
  end_time: number
  extra: Extra2
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
  extra: Extra
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
  text_extra: null
  user_id: string
  [property: string]: any
}

type Extra = {
  big_thumb: null
  decorated_emoji_info: null
  style_list: null
  [property: string]: any
}

type Extra2 = {
  fatal_item_ids: unknown[]
  logid: string
  now: number
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}
