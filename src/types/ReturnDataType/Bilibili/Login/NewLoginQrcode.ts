export type NewLoginQrcode = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  qrcode_key: string
  url: string;
  [property: string]: any
}
