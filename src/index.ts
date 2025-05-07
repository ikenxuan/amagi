export * from 'amagi/model'
export * from 'amagi/platform'
export * from 'amagi/server'
export * from 'amagi/types'

import { amagiClient, cookiesOptions } from 'amagi/server'

/** amagi 的构造函数类型 */
export type AmagiConstructor = {
  new(options: cookiesOptions): amagiClient
  (options: cookiesOptions): amagiClient
}

/**
 * 创建一个新的 amagi 客户端实例
 * @param data - cookies 配置选项
 * @returns 返回一个新的 amagi 客户端实例
 */
const createAmagiClient = (data: cookiesOptions): amagiClient => {
  return new amagiClient(data)
}

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
export const Client = createAmagiClient as AmagiConstructor

export default Client