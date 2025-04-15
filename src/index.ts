export * from 'amagi/model'
export * from 'amagi/platform'
export * from 'amagi/server'
export * from 'amagi/types'

import { amagiClient, ckParams } from 'amagi/server'
export default amagiClient

/**
 * 初始化 amagi
 * @param options 配置参数
 * @returns amagi 实例
 */
export function amagi (options: ckParams) {
  return new amagiClient(options)
}

/**
 * 初始化 amagi
 * @deprecated 即将废弃，请使用 amagi 代替
 * @param options 配置参数
 * @returns amagi 实例
 */
export function Amagi (options: ckParams) {
  return new amagiClient(options)
}
