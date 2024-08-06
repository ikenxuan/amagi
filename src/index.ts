export * from 'amagi/model'
export * from 'amagi/business'
export * from 'amagi/types'
export * from 'amagi/server'
import { client } from 'amagi/server'

export const amagi = client
export { amagi as default }

