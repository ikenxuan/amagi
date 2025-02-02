export type VideoPlayurl = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  accept_description: string[]
  accept_format: string
  accept_quality: number[]
  dash: Dash
  format: string
  from: string
  high_format: null
  last_play_cid: number
  last_play_time: number
  message: string
  quality: number
  result: string
  seek_param: string
  seek_type: string
  support_formats: SupportFormat[]
  timelength: number
  video_codecid: number
  view_info: null;
  [property: string]: any
}

type Dash = {
  audio: Audio[]
  dolby: Dolby
  duration: number
  flac: null
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
  mime_type: string
  mimeType: string
  sar: string
  segment_base: AudioSegmentBaseObject
  SegmentBase: AudioSegmentBase
  start_with_sap: number
  startWithSap: number
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
  audio: null
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
  mime_type: string
  mimeType: string
  sar: string
  segment_base: VideoSegmentBaseObject
  SegmentBase: VideoSegmentBase
  start_with_sap: number
  startWithSap: number
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

type SupportFormat = {
  codecs: string[]
  display_desc: string
  format: string
  new_description: string
  quality: number
  superscript: string;
  [property: string]: any
}
