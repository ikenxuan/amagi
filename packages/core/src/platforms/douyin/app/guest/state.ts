import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import type { SerializedCookieJar } from 'tough-cookie'

import type { AppDevice } from './device'

export interface AppGuestSnapshot {
  version: 1
  device: AppDevice
  cookies: SerializedCookieJar
  refreshedAt: number
}
export const loadAppSnapshot = (file?: string): AppGuestSnapshot | undefined => {
  if (!file || !existsSync(file)) return undefined
  const value = JSON.parse(readFileSync(file, 'utf8')) as AppGuestSnapshot
  if (value.version !== 1 || !value.device?.profile || !value.cookies || typeof value.refreshedAt !== 'number') {
    throw new TypeError('抖音 App 会话文件格式不正确')
  }
  return value
}
export const saveAppSnapshot = (file: string | undefined, value: AppGuestSnapshot): void => {
  if (!file) return
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  renameSync(temporary, file)
}
