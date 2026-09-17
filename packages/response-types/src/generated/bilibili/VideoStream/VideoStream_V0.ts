// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/videoStream.requests.json 里
//   avid / cid  变体0
//   avid / cid  无音轨视频

export type VideoStream_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  accept_description: string[]
  accept_format: string
  accept_quality: number[]
  auto_qn_resp: AutoQnResp
  cur_language: string
  cur_production_type: number
  dash: Dash
  format: string
  from: string
  high_format: null
  last_play_cid: number
  last_play_time: number
  message: string
  play_conf: PlayConf
  quality: number
  result: string
  seek_param: string
  seek_type: string
  support_formats: SupportFormat[]
  timelength: number
  video_codecid: number
  view_info: null
  [property: string]: any
}

type AutoQnResp = {
  dyeid: string
  qn_feature?: QnFeature
  [property: string]: any
}

type QnFeature = {
  quality_tag: string
  sub_tid_name: string
  tid_name: string
  [property: string]: any
}

type Dash = {
  audio: Audio[] | null
  dolby: Dolby
  duration: number
  flac: null
  minBufferTime: number
  min_buffer_time: number
  video: Audio[]
  [property: string]: any
}

type Audio = {
  SegmentBase: SegmentBase
  backupUrl: string[]
  backup_url: string[]
  bandwidth: number
  baseUrl: string
  base_url: string
  codecid: number
  codecs: string
  frameRate: string
  frame_rate: string
  height: number
  id: number
  mimeType: string
  mime_type: string
  sar: string
  segment_base: SegmentBase2
  startWithSap: number
  start_with_sap: number
  width: number
  [property: string]: any
}

type SegmentBase = {
  Initialization: string
  indexRange: string
  [property: string]: any
}

type SegmentBase2 = {
  index_range: string
  initialization: string
  [property: string]: any
}

type Dolby = {
  audio: null
  type: number
  [property: string]: any
}

type PlayConf = {
  is_new_description: boolean
  [property: string]: any
}

type SupportFormat = {
  can_watch_qn_reason: number
  codecs: string[]
  display_desc: string
  format: string
  limit_watch_reason: number
  new_description: string
  quality: number
  report: { [property: string]: any }
  superscript: string
  [property: string]: any
}
