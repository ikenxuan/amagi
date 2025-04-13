export type BiliCheckQrcode = {
  data: CheckQrcodeData
  headers: Headers;
  [property: string]: any
}

type CheckQrcodeData = {
  code: number
  data: DataData
  message: string
  ttl: number;
  [property: string]: any
}

type DataData = {
  code: number
  message: string
  refresh_token: string
  timestamp: number
  url: string;
  [property: string]: any
}

type Headers = {
  'bili-status-code': string
  'bili-trace-id': string
  'cache-control': string
  connection: string
  'content-type': string
  cpu_usage: string
  date: string
  expires: string
  'transfer-encoding': string
  'x-bili-trace-id': string
  'x-cache-webcdn': string
  'x-ticket-status': string;
  [property: string]: any
}
