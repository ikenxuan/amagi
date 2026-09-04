// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。

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
  durl: Durl[]
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
  [property: string]: any
}

type Durl = {
  ahead: string
  backup_url: null
  length: number
  order: number
  size: number
  url: string
  vhead: string
  [property: string]: any
}

type PlayConf = {
  is_new_description: boolean
  [property: string]: any
}

type SupportFormat = {
  can_watch_qn_reason: number
  codecs: null
  display_desc: string
  format: string
  limit_watch_reason: number
  new_description: string
  quality: number
  report: { [property: string]: any }
  superscript: string
  [property: string]: any
}
