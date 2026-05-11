export type BiliProtobufDanmaku_V0 = {
  code: number
  data: DataData
  message: string;
  [property: string]: any
}

type DataData = {
  elems: Elem[];
  [property: string]: any
}

type Elem = {
  action: string
  animation: string
  attr: number
  color: number
  content: string
  ctime: string
  fontsize: number
  id: string
  idStr: string
  midHash: string
  mode: number
  pool: number
  progress: number
  weight: number;
  [property: string]: any
}
