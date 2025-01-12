export * from 'amagi/model'
export * from 'amagi/platform'
export * from 'amagi/server'
export * from 'amagi/types'

import { amagi as AmagiClient, ckParams } from 'amagi/server'
export default AmagiClient
export function Amagi (options: ckParams) {
  return new AmagiClient(options)
}
