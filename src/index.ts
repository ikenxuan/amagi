export * from "amagi/business"
export * from "amagi/model"
export * from "amagi/server"
export * from "amagi/types"

import { amagi, initClientParams } from "amagi/server"
export default amagi
export function Amagi (options: initClientParams) {
  return new amagi(options)
}