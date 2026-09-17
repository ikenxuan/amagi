// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/bangumiStream.requests.json 里
//   cid / ep_id  变体0

export type BangumiStream_V0 = {
  code: number
  message: string
  result: Result
  [property: string]: any
}

type Result = {
  accept_description: string[]
  accept_format: string
  accept_quality: number[]
  bp: number
  can_watch_reason: number
  clip_info_list: ClipInfoList[]
  code: number
  dash: Dash
  durls: unknown[]
  dyeid: string
  error_code: number
  fnval: number
  fnver: number
  format: string
  from: string
  has_paid: boolean
  is_drm: boolean
  is_preview: number
  message: string
  no_rexcode: number
  quality: number
  record_info: RecordInfo
  result: string
  seek_param: string
  seek_type: string
  status: number
  support_formats: SupportFormat[]
  timelength: number
  type: string
  video_codecid: number
  video_project: boolean
  [property: string]: any
}

type ClipInfoList = {
  clipType: string
  end: number
  materialNo: number
  start: number
  toastText: string
  [property: string]: any
}

type Dash = {
  audio: Audio[]
  dolby: Dolby
  duration: number
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
  md5: string
  mimeType: string
  mime_type: string
  sar: string
  segment_base: SegmentBase2
  size: number
  startWithSAP: number
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
  audio: unknown[]
  type: number
  [property: string]: any
}

type RecordInfo = {
  record: string
  record_icon: string
  [property: string]: any
}

type SupportFormat = {
  attribute: number
  can_watch_qn_reason: number
  codecs: string[]
  description: string
  display_desc: string
  format: string
  has_preview: boolean
  limit_watch_reason: number
  need_login?: boolean
  need_vip?: boolean
  new_description: string
  quality: number
  report_params: string
  sub_description: string
  superscript: string
  [property: string]: any
}
