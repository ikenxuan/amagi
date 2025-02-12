/** 番剧下载地址（已登录） */
export type BiliBangumiVideoPlayurlIsLogin = {
  code: number
  message: string
  result: Result;
  [property: string]: any
}

type Result = {
  accept_description: string[]
  accept_format: string
  accept_quality: number[]
  bp: number
  clip_info_list: string[]
  code: number
  dash: Dash
  durls: string[]
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
  vip_status: number
  vip_type: number;
  [property: string]: any
}

type Dash = {
  audio: Audio[]
  dolby: Dolby
  duration: number
  min_buffer_time: number
  minBufferTime: number
  video: Video[];
  [property: string]: any
}

type Audio = {
  backup_url: string[]
  backupUrl: string[]
  bandwidth: number
  base_url: string
  baseUrl: string
  codecid: number
  codecs: string
  frame_rate: string
  frameRate: string
  height: number
  id: number
  md5: string
  mime_type: string
  mimeType: string
  sar: string
  segment_base: AudioSegmentBaseObject
  SegmentBase: AudioSegmentBase
  size: number
  start_with_sap: number
  startWithSAP: number
  width: number;
  [property: string]: any
}

type AudioSegmentBase = {
  indexRange: string
  Initialization: string;
  [property: string]: any
}

type AudioSegmentBaseObject = {
  index_range: string
  initialization: string;
  [property: string]: any
}

type Dolby = {
  audio: string[]
  type: number;
  [property: string]: any
}

type Video = {
  backup_url: string[]
  backupUrl: string[]
  bandwidth: number
  base_url: string
  baseUrl: string
  codecid: number
  codecs: string
  frame_rate: string
  frameRate: string
  height: number
  id: number
  md5: string
  mime_type: string
  mimeType: string
  sar: string
  segment_base: VideoSegmentBaseObject
  SegmentBase: VideoSegmentBase
  size: number
  start_with_sap: number
  startWithSAP: number
  width: number;
  [property: string]: any
}

type VideoSegmentBase = {
  indexRange: string
  Initialization: string;
  [property: string]: any
}

type VideoSegmentBaseObject = {
  index_range: string
  initialization: string;
  [property: string]: any
}

type RecordInfo = {
  record: string
  record_icon: string;
  [property: string]: any
}

type SupportFormat = {
  codecs: string[]
  description: string
  display_desc: string
  format: string
  has_preview: boolean
  need_login: boolean
  need_vip: boolean
  new_description: string
  quality: number
  sub_description: string
  superscript: string;
  [property: string]: any
}