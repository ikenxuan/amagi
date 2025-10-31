/** 番剧下载地址（未登录） */
export type BiliBangumiVideoPlayurlNoLogin = {
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
  durl: Durl[]
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
  video_project: boolean;
  [property: string]: any
}

type Durl = {
  ahead?: string
  backup_url?: string[]
  length?: number
  md5?: string
  order?: number
  size?: number
  url?: string
  vhead?: string;
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
  need_login?: boolean
  new_description: string
  quality: number
  sub_description: string
  superscript: string;
  [property: string]: any
}
