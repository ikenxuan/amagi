import type { QrcodeStatus_V0 } from './QrcodeStatus_V0'

export type QrcodeStatusSuccess = QrcodeStatus_V0
export type QrcodeStatusError = never
export type QrcodeStatus = QrcodeStatusSuccess | QrcodeStatusError
