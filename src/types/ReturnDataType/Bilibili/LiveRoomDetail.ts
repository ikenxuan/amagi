export type LiveRoomDetail = {
  code: number
  data: Data
  message: string
  msg: string;
  [property: string]: any
}

type Data = {
  allow_change_area_time: number
  allow_upload_cover_time: number
  area_id: number
  area_name: string
  area_pendants: string
  attention: number
  background: string
  battle_id: number
  description: string
  hot_words: string[]
  hot_words_status: number
  is_anchor: number
  is_portrait: boolean
  is_strict_room: boolean
  keyframe: string
  live_status: number
  live_time: string
  new_pendants: NewPendants
  old_area_id: number
  online: number
  parent_area_id: number
  parent_area_name: string
  pendants: string
  pk_id: number
  pk_status: number
  room_id: number
  room_silent_level: number
  room_silent_second: number
  room_silent_type: string
  short_id: number
  studio_info: StudioInfo
  tags: string
  title: string
  uid: number
  up_session: string
  user_cover: string
  verify: string;
  [property: string]: any
}

type NewPendants = {
  badge: Badge
  frame: Frame
  mobile_badge: null
  mobile_frame: MobileFrame;
  [property: string]: any
}

type Badge = {
  desc: string
  name: string
  position: number
  value: string;
  [property: string]: any
}

type Frame = {
  area: number
  area_old: number
  bg_color: string
  bg_pic: string
  desc: string
  name: string
  position: number
  use_old_area: boolean
  value: string;
  [property: string]: any
}

type MobileFrame = {
  area: number
  area_old: number
  bg_color: string
  bg_pic: string
  desc: string
  name: string
  position: number
  use_old_area: boolean
  value: string;
  [property: string]: any
}

type StudioInfo = {
  master_list: string[]
  status: number;
  [property: string]: any
}
