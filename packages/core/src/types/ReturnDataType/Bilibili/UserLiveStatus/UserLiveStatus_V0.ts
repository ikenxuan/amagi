export type BiliUserLiveStatus_V0 = {
  code: number
  data: DataData
  message: string
  ttl: number
  [property: string]: any
}

type DataData = {
  broadcast_type: number
  cover: string
  link: string
  liveStatus: number
  online: number
  online_hidden: number
  roomid: number
  roomStatus: number
  roundStatus: number
  title: string
  url: string
  [property: string]: any
}
