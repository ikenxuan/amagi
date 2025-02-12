/** 视频下载地址（未登录） */
export type BiliBiliVideoPlayurlNoLogin = {
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
  durl: Durl[]
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

type Durl = {
  ahead?: string
  backup_url?: null
  length?: number
  order?: number
  size?: number
  url?: string
  vhead?: string;
  [property: string]: any
}

type SupportFormat = {
  codecs?: null
  display_desc?: string
  format?: string
  new_description?: string
  quality?: number
  superscript?: string;
  [property: string]: any
}