export type BiliLiveRoomDef = {
  code: number
  data: Data
  message: string
  msg: string;
  [property: string]: any
}

type Data = {
  encrypted: boolean
  hidden_till: number
  is_hidden: boolean
  is_locked: boolean
  is_portrait: boolean
  is_sp: number
  live_status: number
  live_time: number
  lock_till: number
  need_p2p: number
  pwd_verified: boolean
  room_id: number
  room_shield: number
  short_id: number
  special_type: number
  uid: number;
  [property: string]: any
}
