import { AxiosResponse } from 'axios'

export type BiliCheckQrcode = {
  code: number
  data: PurpleData
  message: string;
  [property: string]: any
}

type PurpleData = {
  data: FluffyData
  headers: AxiosResponse['headers'];
  [property: string]: any
}

type FluffyData = {
  code: number
  message: string
  refresh_token: string
  timestamp: number
  url: string;
  [property: string]: any
}
