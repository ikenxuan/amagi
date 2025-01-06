export * from 'amagi/platform'
export * from 'amagi/model'
export * from 'amagi/server'
export * from 'amagi/types'

import { amagi as AmagiClient, initClientParams } from 'amagi/server'
export default AmagiClient
export function Amagi (options: initClientParams) {
  return new AmagiClient(options)
}
