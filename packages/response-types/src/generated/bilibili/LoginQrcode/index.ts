import type { LoginQrcode_V0 } from './LoginQrcode_V0'

export type LoginQrcodeSuccess = LoginQrcode_V0
export type LoginQrcodeError = never
export type LoginQrcode = LoginQrcodeSuccess | LoginQrcodeError
